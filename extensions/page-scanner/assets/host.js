/**
 * Page Scanner's native messaging host (#113).
 *
 * Chrome starts this when the extension calls `connectNative`, after checking
 * the extension's id against the host manifest `page-scanner install` wrote.
 * It dials the daemon's bridge port as the extension would have, puts the
 * pairing's token into the handshake, and from then on carries frames between
 * the two: Chrome's length-prefixed JSON messages on stdin and stdout, the
 * bridge's text frames on the WebSocket. So the server sees an ordinary
 * paired browser, and the person never sees a port or a token.
 *
 * It waits for the daemon rather than starting one: the daemon is started by
 * whatever wants a scan (a command, an agent), as it always was, and this
 * connects within a retry of it appearing. The connection to Chrome stays open
 * while it waits, which keeps the extension's service worker alive to answer.
 *
 * Self-contained on purpose. `install` copies this one file out of the package
 * to a path that does not move (an `npx` cache does), so it imports nothing but
 * Node's own modules, and restates the few constants it shares with
 * `../protocol.ts`; `host.test.ts` fails if the two disagree. It uses Node's own
 * WebSocket client, which can set the `Origin` header the server checks.
 */
import { readFileSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
/** Mirrors NATIVE_FROM_HOST_CHUNK_CHARS in `../protocol.ts`. */
export const FROM_HOST_CHUNK_CHARS = 128 * 1024;
/** Mirrors DEFAULT_PORT in `../config.ts`. */
export const HOST_DEFAULT_PORT = 45711;
/** How often to look for a daemon that is not running yet. A refused connect costs nothing. */
export const RETRY_MS = 1_500;
/**
 * Chrome refuses a message to a host over 64 MiB, so nothing larger can arrive
 * whole; a length past that is a stream this cannot trust.
 */
const MAX_MESSAGE_BYTES = 64 * 1024 * 1024;
/**
 * A reassembled frame from the extension: a scan's file, base64, can be large,
 * but the server refuses a frame over 100 MiB (`ws`'s default), so past that
 * there is nothing to carry it to.
 */
const MAX_FRAME_CHARS = 128 * 1024 * 1024;
/** `PAGE_SCANNER_HOME` is set by the wrapper `install` writes, and by tests. */
export function hostHome(env = process.env) {
    return env.PAGE_SCANNER_HOME ?? join(homedir(), '.page-scanner');
}
/** Reads the pairing the way `../config.ts` does, and never throws. */
export function readPairing(home) {
    try {
        const raw = JSON.parse(readFileSync(join(home, 'config.json'), 'utf8'));
        const record = typeof raw === 'object' && raw !== null ? raw : {};
        return {
            port: Number(record.port) || HOST_DEFAULT_PORT,
            token: typeof record.token === 'string' ? record.token : '',
        };
    }
    catch {
        return { port: HOST_DEFAULT_PORT, token: '' };
    }
}
/**
 * The caller's origin, which Chrome passes as the first argument:
 * `chrome-extension://<id>/`. Windows adds `--parent-window=<n>` after it.
 */
export function callerOrigin(argv) {
    const found = argv.find((arg) => /^chrome-extension:\/\/[a-p]{32}\/?$/.test(arg));
    return found ? found.replace(/\/$/, '') : null;
}
/** One native message: a 32-bit length in native byte order, then UTF-8 JSON. */
export function encodeMessage(value) {
    const body = Buffer.from(JSON.stringify(value), 'utf8');
    const header = Buffer.alloc(4);
    header.writeUInt32LE(body.length, 0);
    return Buffer.concat([header, body]);
}
/** Splits stdin into messages as they complete. Throws on a length it cannot trust. */
export class MessageReader {
    buffer = Buffer.alloc(0);
    push(chunk) {
        this.buffer = this.buffer.length === 0 ? chunk : Buffer.concat([this.buffer, chunk]);
        const messages = [];
        while (this.buffer.length >= 4) {
            const length = this.buffer.readUInt32LE(0);
            if (length > MAX_MESSAGE_BYTES)
                throw new Error(`a message of ${length} bytes`);
            if (this.buffer.length < 4 + length)
                break;
            const body = this.buffer.subarray(4, 4 + length).toString('utf8');
            this.buffer = this.buffer.subarray(4 + length);
            messages.push(JSON.parse(body));
        }
        return messages;
    }
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/** Runs the host until Chrome closes stdin or the server closes the connection. */
export function runHost(deps) {
    const reader = new MessageReader();
    const log = deps.log ?? (() => { });
    let socket = null;
    let opened = false;
    let done = false;
    let retry = null;
    let pairing = { port: HOST_DEFAULT_PORT, token: '' };
    let pending = '';
    let sentHello = false;
    const send = (value) => {
        if (!done)
            deps.write(encodeMessage(value));
    };
    const end = (code) => {
        if (done)
            return;
        done = true;
        if (retry !== null)
            deps.clearTimeout(retry);
        retry = null;
        const current = socket;
        socket = null;
        try {
            current?.close();
        }
        catch {
            /* already gone */
        }
        deps.finish(code);
    };
    /** Sends a frame from the server to the extension, in pieces Chrome will take. */
    const toExtension = (data) => {
        if (data.length <= FROM_HOST_CHUNK_CHARS) {
            send({ type: 'native-frame', data });
            return;
        }
        for (let start = 0; start < data.length; start += FROM_HOST_CHUNK_CHARS) {
            const stop = Math.min(start + FROM_HOST_CHUNK_CHARS, data.length);
            send({ type: 'native-frame', data: data.slice(start, stop), more: stop < data.length });
        }
    };
    /**
     * The extension's hello carries no token, since it holds none on this path;
     * this is the one frame the host reads rather than carries.
     */
    const toServer = (data) => {
        let frame = data;
        if (!sentHello) {
            try {
                const value = JSON.parse(data);
                if (isRecord(value) && value.type === 'hello') {
                    frame = JSON.stringify({ ...value, token: pairing.token });
                    sentHello = true;
                }
            }
            catch {
                /* not JSON; the server drops it */
            }
        }
        try {
            socket?.send(frame);
        }
        catch {
            /* the close that follows says so */
        }
    };
    const dial = () => {
        retry = null;
        if (done)
            return;
        pairing = deps.readPairing();
        if (!pairing.token) {
            // No pairing on this machine yet: `install` writes one, so wait for it.
            retry = deps.setTimeout(dial, RETRY_MS);
            return;
        }
        let next;
        try {
            next = deps.connect(`ws://127.0.0.1:${String(pairing.port)}/page-scanner`, deps.origin);
        }
        catch (error) {
            log(`could not dial: ${error instanceof Error ? error.message : String(error)}`);
            retry = deps.setTimeout(dial, RETRY_MS);
            return;
        }
        socket = next;
        next.onopen = () => {
            if (socket !== next)
                return;
            opened = true;
            send({ type: 'native-open' });
        };
        next.onmessage = (event) => {
            if (socket === next && typeof event.data === 'string')
                toExtension(event.data);
        };
        next.onerror = () => {
            /* the close that follows is where this is handled */
        };
        next.onclose = (event) => {
            if (socket !== next)
                return;
            socket = null;
            if (!opened) {
                // Nothing listening yet. Look again shortly, with Chrome's port held open.
                retry = deps.setTimeout(dial, RETRY_MS);
                return;
            }
            // The server went away or refused us. Say why and stop: the extension
            // reconnects on its own schedule, and Chrome starts a fresh host for it.
            send({
                type: 'native-close',
                reason: event.reason || 'the local agent server closed the connection',
            });
            end(0);
        };
    };
    deps.input.on('data', (chunk) => {
        let messages;
        try {
            messages = reader.push(chunk);
        }
        catch (error) {
            log(`unreadable input: ${error instanceof Error ? error.message : String(error)}`);
            end(1);
            return;
        }
        for (const message of messages) {
            if (!isRecord(message) || message.type !== 'native-frame')
                continue;
            if (typeof message.data !== 'string')
                continue;
            pending += message.data;
            if (pending.length > MAX_FRAME_CHARS) {
                log('a frame too large to carry');
                end(1);
                return;
            }
            if (message.more === true)
                continue;
            const data = pending;
            pending = '';
            if (opened)
                toServer(data);
        }
    });
    // Chrome closes stdin when the extension disconnects, or when it exits.
    deps.input.on('end', () => end(0));
    deps.input.on('error', () => end(0));
    dial();
}
/** The real thing: stdio, Node's WebSocket, and `process.exit`. */
export function main(argv = process.argv.slice(2)) {
    const origin = callerOrigin(argv);
    if (!origin) {
        process.stderr.write("page-scanner's native host is started by Chrome, for the Page Scanner extension.\n");
        process.exit(2);
    }
    const home = hostHome();
    runHost({
        input: process.stdin,
        write: (message) => process.stdout.write(message),
        finish: (code) => {
            // Let the last message reach Chrome before going.
            process.stdout.write('', () => process.exit(code));
        },
        origin,
        readPairing: () => readPairing(home),
        connect: (url, from) => new WebSocket(url, {
            headers: { origin: from },
        }),
        setTimeout: (fn, ms) => setTimeout(fn, ms),
        clearTimeout: (handle) => clearTimeout(handle),
        // Chrome writes a host's stderr to its own log, which is where to look.
        log: (message) => process.stderr.write(`page-scanner native host: ${message}\n`),
    });
}
/** True when Node was started on this file, rather than a test importing it. */
function isEntryPoint() {
    const entry = process.argv[1];
    if (!entry)
        return false;
    try {
        return pathToFileURL(realpathSync(entry)).href === import.meta.url;
    }
    catch {
        return false;
    }
}
if (isEntryPoint())
    main();
//# sourceMappingURL=host.js.map