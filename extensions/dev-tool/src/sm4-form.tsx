import { Form, ActionPanel, Action, LocalStorage, confirmAlert, Alert } from "@raycast/api";
import { useState, useEffect } from "react";
import { SM4 } from "gm-crypto";
import { success, failure } from "./utils/result";

const KEY_HISTORY_STORAGE = "sm4-key-history";

async function loadKeyHistory(): Promise<Sm4KeyHistory[]> {
  const raw = await LocalStorage.getItem<string>(KEY_HISTORY_STORAGE);
  return raw ? JSON.parse(raw) : [];
}

async function saveKeyHistory(list: Sm4KeyHistory[]) {
  await LocalStorage.setItem(KEY_HISTORY_STORAGE, JSON.stringify(list));
}

async function addKeyToHistory(key: string) {
  const list = await loadKeyHistory();

  const filtered = list.filter((k) => k.value !== key);
  filtered.unshift({ value: key, lastUsedAt: Date.now() });

  await saveKeyHistory(filtered.slice(0, 10)); // 最多保留 10 个
}

async function deleteKey(key: string) {
  const list = await loadKeyHistory();
  await saveKeyHistory(list.filter((k) => k.value !== key));
}

export default function SM4FormCommand() {
  const [mode, setMode] = useState<"ECB" | "CBC">("ECB");
  const [action, setAction] = useState<"encrypt" | "decrypt">("encrypt");
  const [keyHistory, setKeyHistory] = useState<Sm4KeyHistory[]>([]);
  const [keySelect, setKeySelect] = useState("__manual__");
  // 输出格式，根据 action 默认
  const [format, setFormat] = useState<"hex" | "base64" | "utf8">(action === "encrypt" ? "hex" : "utf8");

  // 只在组件初始化时加载 key 历史
  useEffect(() => {
    loadKeyHistory().then(setKeyHistory);
  }, []);
  // 当 action 改变时，同步调整默认输出格式
  useEffect(() => {
    setFormat(action === "encrypt" ? "hex" : "utf8");
  }, [action]);

  async function handleSubmit(values: unknown) {
    try {
      const { text, iv } = values;

      const key = values.keySelect === "__manual__" ? values.keyInput : values.keySelect;

      if (!text) throw new Error("请输入要加/解密的文本");
      if (!key || key.length !== 32) throw new Error("请输入有效的 32 字符 Hex 密钥");

      const cipherIs = detectEncoding(text);
      const opts: unknown = {
        mode,
        iv: iv || undefined,
        inputEncoding: "utf8",
        outputEncoding: format,
      };

      let result = "";
      if (action === "encrypt") {
        if (opts.outputEncoding === "utf8") {
          throw new Error("加密操作时输出格式不能为UTF-8");
        }
        result = SM4.encrypt(text, key, opts);
      } else {
        if (cipherIs !== "hex" && cipherIs !== "base64") {
          throw new Error("输入看起来不像合法密文（hex 或 base64）");
        }
        opts.inputEncoding = cipherIs === "hex" ? "hex" : cipherIs === "base64" ? "base64" : "utf8";
        result = SM4.decrypt(text, key, opts);
      }

      await success(result, { title: `${action === "encrypt" ? "加密" : "解密"}成功` });

      await addKeyToHistory(key);
      setKeyHistory(await loadKeyHistory());
    } catch (err) {
      await failure(err, `${action === "encrypt" ? "加密" : "解密"}失败`);
    }
  }

  function detectEncoding(str: string): "hex" | "base64" | "utf8" {
    const hexRegex = /^[0-9a-fA-F]+$/;
    const base64Regex = /^[A-Za-z0-9+/]+=*$/;

    // 1) 先判断 hex
    if (hexRegex.test(str) && str.length % 2 === 0) {
      return "hex";
    }

    // 2) 再判断 base64
    //    且长度必须是 base64 的整倍数
    if (base64Regex.test(str) && str.length % 4 === 0 && !/[^A-Za-z0-9+/=]/.test(str)) {
      try {
        // 进一步尝试 decode 看能不能成功
        Buffer.from(str, "base64");
        return "base64";
      } catch {
        // 如果解码失败，就不是 base64
      }
    }

    // 3) 否则就是 utf8
    return "utf8";
  }

  return (
    <Form
      navigationTitle="SM4 加密/解密"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="运行" onSubmit={handleSubmit} />

          {keySelect !== "__manual__" && (
            <Action
              title="删除当前密钥"
              icon="🗑"
              style={Action.Style.Destructive}
              onAction={async () => {
                const confirmed = await confirmAlert({
                  title: "确认删除密钥？",
                  message: "此操作无法撤销，将从历史记录中永久删除该密钥。",
                  primaryAction: {
                    title: "删除",
                    style: Alert.ActionStyle.Destructive,
                  },
                  // secondaryCancelAction: { title: "取消" } // 默认就有取消
                });

                if (!confirmed) {
                  return; // 用户取消
                }

                await deleteKey(keySelect);
                setKeyHistory(await loadKeyHistory());
                setKeySelect("__manual__");
              }}
            />
          )}
        </ActionPanel>
      }
    >
      {/* 输入文本 */}
      <Form.TextArea id="text" title="文本（明文/密文）" placeholder="输入需要处理的内容" />

      {/* SM4 Key History */}
      <Form.Dropdown id="keySelect" title="SM4 密钥历史" value={keySelect} onChange={setKeySelect}>
        <Form.Dropdown.Item value="__manual__" title="手动输入" />
        {keyHistory.map((k) => (
          <Form.Dropdown.Item
            key={k.value}
            value={k.value}
            title={`${k.value.slice(0, 6)}******${k.value.slice(28, 32)}`}
          />
        ))}
      </Form.Dropdown>

      {/* SM4 Key Input */}
      {keySelect === "__manual__" && (
        <Form.TextField id="keyInput" title="SM4 密钥（32位 Hex）" placeholder="0123456789abcdeffedcba9876543210" />
      )}

      {/* 操作 Dropdown */}
      <Form.Dropdown id="action" title="操作" value={action} onChange={(v) => setAction(v as unknown)}>
        <Form.Dropdown.Item value="encrypt" title="加密" />
        <Form.Dropdown.Item value="decrypt" title="解密" />
      </Form.Dropdown>

      {/* 模式 Dropdown */}
      <Form.Dropdown id="mode" title="模式" value={mode} onChange={(v) => setMode(v as unknown)}>
        <Form.Dropdown.Item value="ECB" title="ECB（默认）" />
        <Form.Dropdown.Item value="CBC" title="CBC（需 IV）" />
      </Form.Dropdown>

      {/* IV 仅在 CBC 时展示 */}
      {mode === "CBC" && <Form.TextField id="iv" title="IV（32 个 Hex）" placeholder="CBC 模式下需要 IV" />}

      {/* 输出格式 Dropdown（受控） */}
      <Form.Dropdown id="format" title="输出格式" value={format} onChange={setFormat}>
        <Form.Dropdown.Item value="hex" title="Hex" />
        <Form.Dropdown.Item value="base64" title="Base64" />
        {action === "decrypt" && <Form.Dropdown.Item value="utf8" title="UTF‑8（文本）" />}
      </Form.Dropdown>
    </Form>
  );
}
