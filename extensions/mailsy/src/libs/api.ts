import { Cache, LocalStorage, environment } from "@raycast/api";
import axios from "axios";
import fs from "fs/promises";
import { Account, Domain, DomainResponse, Mail, MailResponse, Message, TokenResponse } from "../types";

const BASE_URL = "https://api.mail.tm";
const ACCOUNT_STORAGE_KEY = "account";
const REQUEST_TIMEOUT_MS = 10000;
const messageCache = new Cache();

const api = axios.create({
  baseURL: BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
});

const generateRandomString = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

const generateEmail = (domain: string): string => {
  return `${generateRandomString()}@${domain}`;
};

const generatePassword = (): string => {
  return generateRandomString();
};

const fetchDomains = async (): Promise<Domain[]> => {
  const response = await api.get<DomainResponse>("/domains");
  return response.data["hydra:member"];
};

const createRemoteAccount = async (email: string, password: string): Promise<void> => {
  await api.post("/accounts", {
    address: email,
    password,
  });
};

const fetchAccountToken = async (email: string, password: string): Promise<TokenResponse> => {
  const response = await api.post<TokenResponse>("/token", {
    address: email,
    password,
  });

  return response.data;
};

const deleteRemoteAccount = async (id: string, token: string): Promise<void> => {
  await api.delete(`/accounts/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

const fetchMailSummaries = async (token: string): Promise<Mail[]> => {
  const response = await api.get<MailResponse>("/messages", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data["hydra:member"];
};

const fetchMessage = async (id: string, token: string): Promise<Message> => {
  const response = await api.get<Message>(`/messages/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

const deleteRemoteMessage = async (id: string, token: string): Promise<void> => {
  await api.delete(`/messages/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

const saveAccount = async (account: Account): Promise<void> => {
  await LocalStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(account));
};

const getCachedMessage = (id: string): Message | null => {
  const cachedMessage = messageCache.get(id);
  return cachedMessage ? (JSON.parse(cachedMessage) as Message) : null;
};

const cacheMessage = (message: Message): void => {
  messageCache.set(message.id, JSON.stringify(message));
};

export const getMessageFilePath = (messageId: string): string => {
  return `${environment.assetsPath}/${messageId}.html`;
};

export const getBridgePagePath = (): string => {
  return `${environment.assetsPath}/inbox.html`;
};

export const deleteBridgePage = async (): Promise<void> => {
  try {
    await fs.unlink(getBridgePagePath());
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
      throw error;
    }
  }
};

export const writeBridgePage = async (account: Account): Promise<string> => {
  const filePath = getBridgePagePath();
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Mailsy \u2013 ${account.email}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f7;color:#1d1d1f}
.header{background:#fff;border-bottom:1px solid #e5e5e5;padding:16px 24px;display:flex;align-items:center;justify-content:space-between}
.header h1{font-size:18px;font-weight:600}
.header .email{color:#6e6e73;font-size:14px}
.container{max-width:800px;margin:24px auto;padding:0 16px}
.msg-list{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)}
.msg-item{padding:16px 20px;border-bottom:1px solid #f0f0f0;cursor:pointer;transition:background .15s}
.msg-item:hover{background:#f5f5f7}
.msg-item:last-child{border-bottom:none}
.msg-from{font-weight:600;font-size:14px}
.msg-subject{font-size:14px;margin-top:2px}
.msg-date{font-size:12px;color:#6e6e73;margin-top:4px}
.msg-intro{font-size:13px;color:#6e6e73;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.msg-view{background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1);padding:24px}
.back{cursor:pointer;color:#007aff;font-size:14px;margin-bottom:16px;display:inline-block;text-decoration:none}
.back:hover{text-decoration:underline}
.msg-view h2{font-size:20px;margin-bottom:8px}
.msg-view .meta{color:#6e6e73;font-size:13px;margin-bottom:16px}
.msg-view iframe{width:100%;border:none;min-height:500px;border-radius:8px}
.empty,.loading{text-align:center;padding:48px;color:#6e6e73}
.err{text-align:center;padding:48px;color:#ff3b30}
.btn{background:none;border:1px solid #e5e5e5;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:13px;color:#007aff}
.btn:hover{background:#f5f5f7}
</style>
</head>
<body>
<div class="header">
<div><h1>Mailsy</h1><div class="email">${account.email}</div></div>
<button class="btn" onclick="loadInbox()">Refresh</button>
</div>
<div class="container"><div id="c"><div class="loading">Loading\u2026</div></div></div>
<script>
var T='${account.token}',A='${BASE_URL}',H={Authorization:'Bearer '+T};
function esc(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML}
function loadInbox(){
var el=document.getElementById('c');
el.innerHTML='<div class="loading">Loading\u2026</div>';
fetch(A+'/messages',{headers:H}).then(function(r){if(!r.ok)throw new Error('Failed to load ('+r.status+')');return r.json()}).then(function(d){
var m=d['hydra:member']||[];
if(!m.length){el.innerHTML='<div class="empty">No messages yet</div>';return}
el.innerHTML='<div class="msg-list">'+m.map(function(x){
return '<div class="msg-item" onclick="viewMsg(\\''+x.id+'\\')">'
+'<div class="msg-from">'+esc(x.from&&(x.from.name||x.from.address)||'Unknown')+'</div>'
+'<div class="msg-subject">'+esc(x.subject||'No Subject')+'</div>'
+'<div class="msg-intro">'+esc(x.intro||'')+'</div>'
+'<div class="msg-date">'+new Date(x.createdAt).toLocaleString()+'</div></div>';
}).join('')+'</div>';
}).catch(function(e){el.innerHTML='<div class="err">'+esc(e.message)+'</div>'})
}
function viewMsg(id){
var el=document.getElementById('c');
el.innerHTML='<div class="loading">Loading\u2026</div>';
fetch(A+'/messages/'+id,{headers:H}).then(function(r){if(!r.ok)throw new Error('Failed to load message');return r.json()}).then(function(m){
var h=(m.html&&m.html[0])||'';
el.innerHTML='<div class="msg-view">'
+'<a class="back" onclick="loadInbox()">\\u2190 Back to Inbox</a>'
+'<h2>'+esc(m.subject||'No Subject')+'</h2>'
+'<div class="meta">From: '+esc((m.from&&m.from.name)||'')+' &lt;'+esc((m.from&&m.from.address)||'')+'&gt; \\u00b7 '+new Date(m.createdAt).toLocaleString()+'</div>'
+(h?'<iframe sandbox srcdoc="'+h.replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'"></iframe>':'<p>'+esc(m.text||'No content')+'</p>')
+'</div>';
}).catch(function(e){el.innerHTML='<div class="err">'+esc(e.message)+'<br><a class="back" onclick="loadInbox()">\\u2190 Back</a></div>'})
}
loadInbox();
</script>
</body>
</html>`;
  await fs.writeFile(filePath, html, "utf-8");
  return filePath;
};

const writeMessageFile = async (message: Message): Promise<void> => {
  const content = message.html?.[0] ?? "No Content";
  await fs.writeFile(getMessageFilePath(message.id), content, "utf-8");
};

const ensureMessageFile = async (message: Message): Promise<void> => {
  try {
    await fs.access(getMessageFilePath(message.id));
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
      throw error;
    }

    await writeMessageFile(message);
  }
};

const deleteMessageFile = async (id: string): Promise<void> => {
  try {
    await fs.unlink(getMessageFilePath(id));
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
      throw error;
    }
  }
};

const getMessageById = async (id: string, token: string): Promise<Message> => {
  const cachedMessage = getCachedMessage(id);
  if (cachedMessage) {
    await ensureMessageFile(cachedMessage);
    return cachedMessage;
  }

  const message = await fetchMessage(id, token);
  await ensureMessageFile(message);
  cacheMessage(message);
  return message;
};

export const createAccount = async (): Promise<void> => {
  const domains = await fetchDomains();
  const domain = domains[0]?.domain;

  if (!domain) {
    throw new Error("No mail domain available");
  }

  const email = generateEmail(domain);
  const password = generatePassword();

  await createRemoteAccount(email, password);

  const tokenResponse = await fetchAccountToken(email, password);

  await saveAccount({
    email,
    password,
    token: tokenResponse.token,
    id: tokenResponse.id,
  });
};

export const getAccount = async (): Promise<Account | undefined> => {
  const account = await LocalStorage.getItem<string>(ACCOUNT_STORAGE_KEY);
  return account ? (JSON.parse(account) as Account) : undefined;
};

export const deleteAccount = async (): Promise<void> => {
  const account = await getAccount();
  if (!account) return;

  await deleteRemoteAccount(account.id, account.token);
  await LocalStorage.removeItem(ACCOUNT_STORAGE_KEY);
  await deleteBridgePage();
};

export const getMails = async (): Promise<Message[]> => {
  const account = await getAccount();
  if (!account) return [];

  const mailSummaries = await fetchMailSummaries(account.token);
  const messages = await Promise.all(mailSummaries.map((mail) => getMessageById(mail.id, account.token)));

  return messages;
};

export const deleteMail = async (id: string): Promise<void> => {
  const account = await getAccount();
  if (!account) return;

  messageCache.remove(id);
  await deleteMessageFile(id);
  await deleteRemoteMessage(id, account.token);
};

export const getMessage = async (id: string): Promise<Message | null> => {
  const account = await getAccount();
  if (!account) return null;

  return getMessageById(id, account.token);
};
