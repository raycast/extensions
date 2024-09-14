import { showHUD, Clipboard } from "@raycast/api";

export default async function main() {
  //获取剪切板中的数据
  const clipboardContent = await Clipboard.read();
  //[![](https://mermaid.ink/img/pako:eNqdkt9rE0EQx_-VZZ_Tp77lQWgSUMFA6aVJNScy3M3lju7dhs1egpSC1hBFKKmQaNVQIbZVoZiIUcsV_5vcXfJfuJczEn88uU_D7Hc-39nZ2aMGN5FmqcV4y7BBSFIq6B5Rp-luVCs7t5wm3gBmrZfXyw62ikrNSNT7Gj4ZEyGNaHARDsazd5358Fn05WH8qh2-PpmNH91NGWtr1xQnV1XKe4wbwMqOiVyTAsGtONIugIRNgTZ4JsM8MJYDYzdJZn8D5Kvh-UF0Mgi7o-nVWfipH58Gs8kkDi4z8dVLknapScfYRbFhQl2iINHTfvj8YKuUj_rj6PAj0RUQTLOy81OX2KvbxGzFC9Lq5cv_ZL59EL05u71dDrvH88fd6HgUHp3Hvc-z0bdp0Ik_BPMXk79huX_D1JTi3nticK-JQi4GkzSz6AtaSbjoefb9Ijocqk5_Kcj0MiD5ogZunWHOtywUW2it-BrggoDkDVopDy4KSL5uaVgX3MBGI_2JFUaWzIft8LQdH3XSka0Qr29up6Cqim66UMNFeZr7XzDNUFXugmOq_dtLcjqVNrqo06wKTbTAZ1KnurevpOBLrt33DJqVwscM9esmSCw4UBPgLpNoOpKLYrrSi83O0Dp4dzhXEgtYQ2kE92t2WrD_AygTQaI?type=png)](https://mermaid.live/edit#pako:eNqdkt9rE0EQx_-VZZ_Tp77lQWgSUMFA6aVJNScy3M3lju7dhs1egpSC1hBFKKmQaNVQIbZVoZiIUcsV_5vcXfJfuJczEn88uU_D7Hc-39nZ2aMGN5FmqcV4y7BBSFIq6B5Rp-luVCs7t5wm3gBmrZfXyw62ikrNSNT7Gj4ZEyGNaHARDsazd5358Fn05WH8qh2-PpmNH91NGWtr1xQnV1XKe4wbwMqOiVyTAsGtONIugIRNgTZ4JsM8MJYDYzdJZn8D5Kvh-UF0Mgi7o-nVWfipH58Gs8kkDi4z8dVLknapScfYRbFhQl2iINHTfvj8YKuUj_rj6PAj0RUQTLOy81OX2KvbxGzFC9Lq5cv_ZL59EL05u71dDrvH88fd6HgUHp3Hvc-z0bdp0Ik_BPMXk79huX_D1JTi3nticK-JQi4GkzSz6AtaSbjoefb9Ijocqk5_Kcj0MiD5ogZunWHOtywUW2it-BrggoDkDVopDy4KSL5uaVgX3MBGI_2JFUaWzIft8LQdH3XSka0Qr29up6Cqim66UMNFeZr7XzDNUFXugmOq_dtLcjqVNrqo06wKTbTAZ1KnurevpOBLrt33DJqVwscM9esmSCw4UBPgLpNoOpKLYrrSi83O0Dp4dzhXEgtYQ2kE92t2WrD_AygTQaI)
  //\[\!\[\]\((.*)\)\]\((.*)\)
  //正则匹配
  const reg = /\[\!\[\]\((.*)\)\]\((.*)\)/;
  const match = clipboardContent.text.match(reg);
  if (match && match.length > 2) {
    const newStr = `![](${match[1]})\n[编辑](${match[2]})`;
    await Clipboard.copy(newStr);
    await Clipboard.paste(newStr);
    showHUD("匹配成功,已粘贴");
  } else {
    showHUD("该脚本是用来解析mermaid的图片链接的,请先复制图片链接再运行该脚本")
  }
  //重新组合字符串
}
