"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Session = exports.LoginError = exports.NotSignedInError = void 0;
// 鉴权 session。**正式 CLI 不支持匿名态**——必须先 `jovida login`。
//
// 登录 = OAuth 设备授权流（RFC 8628 语义，vita 线格式）：
//   device_authorize（匿名）拿 deviceCode(密)+userCode(短码) → 用户在浏览器登录批准
//   → 轮询 device_token，reason=="" 即批准、返回 Sign 态 vita token → 落盘 token.raw。
// 凭证 = 单枚 vita token（raw 内含 access/refresh 双窗）；access 临期用 refresh_token 续；
// refresh 死 → NotSignedIn，重跑 login。**不走 apikey/Bearer。**
// 过渡：`loginWithToken` 直粘一枚 Sign token（开发期，无 durs 故不自动 refresh）。
const api_1 = require("./api");
const state_1 = require("./state");
const AUTHORIZE = '/uc/v1/passport/device_authorize';
const DEVICE_TOKEN = '/uc/v1/passport/device_token';
const REFRESH = '/uc/v1/passport/refresh_token';
const USER_INFO = '/uc/v1/user/get_user_info';
const SKEW = 60;
const nowSec = () => Math.floor(Date.now() / 1000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** 未登录 / 会话失效。CLI 不回退匿名。 */
class NotSignedInError extends Error {
    constructor(msg = 'Not signed in. Run `jovida login` first.') {
        super(msg);
        this.name = 'NotSignedInError';
    }
}
exports.NotSignedInError = NotSignedInError;
/** 设备流登录的可重试失败(超时 / 过期 / 被拒 / 异常响应)→ exit 3(瞬时态,重试登录)。 */
class LoginError extends Error {
    constructor(msg) {
        super(msg);
        this.name = 'LoginError';
    }
}
exports.LoginError = LoginError;
class Session {
    api;
    refreshing = null;
    constructor(api) {
        this.api = api;
        const t = (0, state_1.getToken)();
        if (t)
            api.setToken(t.raw);
    }
    /** 业务命令前：无 token → NotSignedIn；refresh 窗口已死 → 提前要求重登；access 临期 → 续期。 */
    async ensureSession() {
        const t = (0, state_1.getToken)();
        if (!t)
            throw new NotSignedInError();
        this.api.setToken(t.raw);
        // refresh 窗口已过：续期必然失败,直接清凭证要求重登(省一次注定 401 的请求)。
        if (t.refreshDur > 0 && nowSec() > t.receivedAt + t.refreshDur - SKEW) {
            (0, state_1.clearCredentials)();
            throw new NotSignedInError('Session expired. Run `jovida login` again.');
        }
        if (t.accessDur > 0 && nowSec() > t.receivedAt + t.accessDur - SKEW)
            await this.refresh();
    }
    // ── 设备授权流 ────────────────────────────────────────────────
    /** 第 1 步：发起。device endpoints 匿名（清掉可能的旧 token）。 */
    async deviceAuthorize() {
        this.api.setToken('');
        return this.api.post(AUTHORIZE, {});
    }
    /**
     * 第 2 步：按 interval 轮询直到批准 / 拒绝 / 过期 / 超时。
     * reason: ""=已批准(带 token)、AUTHORIZATION_PENDING=继续、SLOW_DOWN=加间隔、ACCESS_DENIED/EXPIRED_TOKEN=终止。
     */
    /** 单次轮询 device_token,归类结果(批准时已落盘 token)。 */
    async pollAttempt(deviceCode) {
        const resp = await this.api.post(DEVICE_TOKEN, { deviceCode });
        if (resp.token?.raw)
            return { kind: 'approved', rec: this.applyToken(resp) }; // reason=="" 已批准
        switch (resp.reason ?? '') {
            case 'AUTHORIZATION_PENDING':
            case '':
                return { kind: 'pending' };
            case 'SLOW_DOWN':
                return { kind: 'slow_down' };
            case 'ACCESS_DENIED':
                return { kind: 'denied' };
            case 'EXPIRED_TOKEN':
                return { kind: 'expired' };
            default:
                throw new LoginError(`Unexpected device_token reason: ${resp.reason}`);
        }
    }
    async pollForToken(d) {
        let interval = Math.max(1, d.interval || 5);
        const deadline = nowSec() + (d.expiresIn || 600);
        for (;;) {
            if (nowSec() >= deadline)
                throw new LoginError('Login timed out before approval. Run `jovida login` again.');
            await sleep(interval * 1000);
            const r = await this.pollAttempt(d.deviceCode);
            if (r.kind === 'approved')
                return r.rec;
            if (r.kind === 'slow_down')
                interval += 5;
            else if (r.kind === 'denied')
                throw new LoginError('Login was denied.');
            else if (r.kind === 'expired')
                throw new LoginError('The login request expired. Run `jovida login` again.');
        }
    }
    /** 设备流登录(阻塞,自动轮询):authorize → present(展示 URL+短码 + 开浏览器) → 轮询落盘。 */
    async loginWithDeviceFlow(present) {
        const d = await this.deviceAuthorize();
        present(d);
        return this.pollForToken(d);
    }
    // ── 过渡 / 续期 / 身份 ─────────────────────────────────────────
    /** 过渡登录（开发期）：直粘 Sign 态 vita token，get_user_info 验活后落盘（durs=0，不自动 refresh）。 */
    async loginWithToken(rawToken) {
        const raw = rawToken.trim();
        if (!raw)
            throw new Error('empty token');
        this.api.setToken(raw);
        const info = await this.fetchUserInfo('That token is not a valid signed-in session.');
        const rec = { raw, vitaId: info.userId, accessDur: 0, refreshDur: 0, receivedAt: nowSec() };
        (0, state_1.setToken)(rec);
        return rec;
    }
    async refresh() {
        if (this.refreshing)
            return this.refreshing;
        this.refreshing = (async () => {
            try {
                const resp = await this.api.post(REFRESH, {});
                this.applyToken(resp);
            }
            catch (e) {
                if (e instanceof api_1.ApiError && (e.status === 401 || e.status === 403)) {
                    (0, state_1.clearCredentials)();
                    throw new NotSignedInError('Session expired. Run `jovida login` again.');
                }
                throw e;
            }
            finally {
                this.refreshing = null;
            }
        })();
        return this.refreshing;
    }
    /** 当前身份（在线查；无凭证 → NotSignedIn）。 */
    async whoami() {
        await this.ensureSession();
        return this.fetchUserInfo('Session is no longer valid.');
    }
    async fetchUserInfo(rejectMsg) {
        let resp;
        try {
            resp = await this.api.get(USER_INFO);
        }
        catch (e) {
            if (e instanceof api_1.ApiError && (e.status === 401 || e.status === 403)) {
                (0, state_1.clearCredentials)();
                throw new NotSignedInError(`${rejectMsg} Run \`jovida login\` again.`);
            }
            throw e;
        }
        return {
            userId: String(resp.user?.vitaId ?? ''),
            jovidaId: resp.user?.vitaHao ?? ''
        };
    }
    applyToken(resp) {
        const tk = resp.token;
        if (!tk?.raw)
            throw new Error('passport response missing token');
        const rec = {
            raw: tk.raw,
            vitaId: String(resp.register?.vitaId ?? (0, state_1.getToken)()?.vitaId ?? ''),
            accessDur: Number(tk.accessDur ?? 0),
            refreshDur: Number(tk.refreshDur ?? 0),
            receivedAt: nowSec()
        };
        (0, state_1.setToken)(rec);
        this.api.setToken(rec.raw);
        return rec;
    }
}
exports.Session = Session;
