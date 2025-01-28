import { Form, ActionPanel, Action, showToast, Toast, Detail } from "@raycast/api";
import React, { useState } from "react";
import * as x509 from "@peculiar/x509";

interface Certificate {
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  serialNumber: string;
  publicKeyType: string;
  publicKeySize?: number;
  signatureAlgorithm: string;
  publicKey: string;
  signature: string;
}

export default function Command() {
  const [certDetails, setCertDetails] = useState<Certificate | null>(null);

  function parseCertificate(pemString: string) {
    try {
      const cert = new x509.X509Certificate(pemString);
      console.log(cert.signatureAlgorithm);
      const details: Certificate = {
        subject: formatDN(cert.subject),
        issuer: formatDN(cert.issuer),
        validFrom: cert.notBefore.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
        validTo: cert.notAfter.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
        serialNumber: stringToHex(cert.serialNumber),
        publicKeyType: cert.publicKey.algorithm.name.toString().toUpperCase(),
        signatureAlgorithm: cert.signatureAlgorithm.hash.name.toString().toUpperCase(),
        publicKey: cert.publicKey.toString(),
        signature: formatHex(cert.signature),
      };
      setCertDetails(details);
    } catch (error) {
      console.error("证书解析错误:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "解析失败",
        message: "证书解析出错，可能是不支持的格式或证书损坏",
      });
    }
  }

  // 格式化 DN 字符串
  function formatDN(dn: string): string {
    return dn
      .split(", ")
      .map((pair) => {
        const [key, value] = pair.split("=");
        const keyMap: { [key: string]: string } = {
          CN: "通用名称",
          O: "组织",
          OU: "组织单位",
          L: "地理位置",
          ST: "省/州",
          C: "国家",
          E: "邮箱",
        };
        return `${keyMap[key] || key}: ${value}`;
      })
      .join("\n");
  }

  // 格式化十六进制字符串
  function formatHex(hex: ArrayBuffer): string {
    return Array.from(new Uint8Array(hex))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join(":")
      .toUpperCase();
  }

  function stringToHex(str: string): string {
    // 每2 个字符切割，最后使用:合并
    return (
      str
        .match(/.{1,2}/g)
        ?.join(":")
        .toUpperCase() ?? ""
    );
  }

  if (certDetails) {
    const markdown = `
# 📜 证书详情

## 👤 证书主体
\`\`\`
${certDetails.subject}
\`\`\`

## 🏢 证书颁发者
\`\`\`
${certDetails.issuer}
\`\`\`


## ⏱️ 有效期
- **生效时间**: \`${certDetails.validFrom}\`
- **过期时间**: \`${certDetails.validTo}\`


## 🔑 公钥信息
\`\`\`
${certDetails.publicKey}
\`\`\`
- **算法类型**: \`${certDetails.publicKeyType}\`
${certDetails.publicKeySize ? `- **密钥长度**: \`${certDetails.publicKeySize} bits\`` : ""}

## 📝 签名
算法：\`${certDetails.signatureAlgorithm}\`

签名：
\`\`\`
${certDetails.signature}
\`\`\`

## 🔢 序列号
\`${certDetails.serialNumber}\`

`;

    return <Detail markdown={markdown} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="解析证书" onSubmit={(values) => parseCertificate(values.certificate)} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="certificate" title="PEM 证书" placeholder="请粘贴 PEM 格式的证书内容..." />
    </Form>
  );
}
