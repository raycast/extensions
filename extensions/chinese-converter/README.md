# Chinese Converter

[English](#chinese-converter-english) | 中文

将数字转换为中文大写金额。

## 🚀 快速上手

在 Raycast 中输入 `Convert Number to RMB` 找到命令，回车并输入数字即可自动转换。

## 🌟 示例

```
0 → 零元整
1 → 壹元整
10 → 壹拾元整
10024 → 壹万零贰拾肆元整
2354350320 → 贰拾叁亿伍仟肆佰叁拾伍万零叁佰贰拾元整

0.1 → 壹角
0.12 → 壹角贰分
1.236 → 壹元贰角肆分（四舍五入为 1.24，默认保留两位小数）
1000000.93 → 壹佰万元玖角叁分
```

## ⚙️ 更多选项

在 Raycast 输入 `Convert Number to RMB` 并选中该命令，按 `Cmd + K` 打开操作面板，选择 `Configure Command` 进入命令配置页面。

### Always Show Yuan / 总是显示元位

默认情况下，不足一元时省略「元」位：

```
0.1 → 壹角
0.12 → 壹角贰分
```

开启选项后：

```
0.1 → 零元壹角
0.12 → 零元壹角贰分
```

### Use Traditional Yuan / 使用圆替代元

默认使用「元」，开启此选项使用「圆」：

```
1 → 壹元整          （默认，使用元）
1 → 壹圆整          （开启后，使用圆）
```

### Append Zheng / 追加整字

默认情况下：

```
1 → 壹元整
1.2 → 壹元贰角
1.23 → 壹元贰角叁分
```

开启后，到角位（无分）时也在末尾加「整」：

```
1.2 → 壹元贰角整
1.23 → 壹元贰角叁分
```

> 依据[《会计基础工作规范》](https://kjs.mof.gov.cn/gongzuotongzhi/202408/P020240801612534470745.pdf)：大写金额数字到元或者角为止的，在“元”或者“角”字之后应当写“整”字或者“正”字；大写金额数字有分的，分字后面不写“整”或者“正”字。

### Use Simple Zheng / 使用正替代整

默认使用「整」，开启此选项后使用「正」：

```
1 → 壹元整          （默认，使用整）
1 → 壹元正          （开启后，使用正）
```

### Custom Prefix / 自定义前缀

在金额前添加自定义文字，默认不添加。

```
1.23 → 壹元贰角叁分
```

若前缀设为 `人民币`：

```
1.23 → 人民币壹元贰角叁分
```

### Rounding Mode / 取整模式

默认使用四舍五入。如需其他取整方式，可从以下模式中选择：

| 模式                            | 说明                      |
| :------------------------------ | :------------------------ |
| 四舍五入 / Round Half Up        | 默认。遇 5 进位           |
| 五舍六入 / Round Half Down      | 遇 5 舍去                 |
| 向上取整 / Round Up             | 只要有多余小数就进位      |
| 向下取整 / Round Down           | 直接丢弃多余小数          |
| 向正无穷取整 / Round Ceil       | 向大数方向舍入            |
| 向负无穷取整 / Round Floor      | 向小数方向舍入            |
| 银行家舍入 / Round Half Even    | 遇 5 取偶数，银行系统常用 |
| 半正无穷取整 / Round Half Ceil  | 遇 5 向大数方向           |
| 半负无穷取整 / Round Half Floor | 遇 5 向小数方向           |

> 如果你不确定选哪个，保持默认的「四舍五入」即可。

#### 各模式详细说明

<details>
<summary>经典舍入（5 是分水岭）</summary>

- **`ROUND_HALF_UP`** 四舍五入
  - 原理：遇到 5 向上（远离 0）进位
  - 示例：`1.5` → `2`，`-1.5` → `-2`
  - 场景：数学课本标准，零售、普通过程计算

- **`ROUND_HALF_DOWN`** 五舍六入
  - 原理：遇到 5 向下（靠近 0）舍去
  - 示例：`1.5` → `1`，`1.51` → `2`，`-1.5` → `-1`
  - 场景：特定的工业标准，或需要稍微调低统计结果的场景

</details>

<details>
<summary>方向性舍入（不看是不是 5，只看方向）</summary>

- **`ROUND_UP`** 远离 0
  - 原理：无论正负，只要有小数就"进位"
  - 示例：`1.1` → `2`，`-1.1` → `-2`
  - 场景：加价/惩罚性计费，超出一点就按完整单位收费

- **`ROUND_DOWN`** 靠近 0
  - 原理：直接抹掉小数部分
  - 示例：`1.9` → `1`，`-1.9` → `-1`
  - 场景：提现/额度消耗，1.99 元的余额只能用 1 元

- **`ROUND_CEIL`** 向正无穷
  - 原理：向数轴右侧舍入
  - 示例：`1.1` → `2`，`-1.9` → `-1`
  - 场景：库存补货，需要 1.1 个箱子就必须准备 2 个

- **`ROUND_FLOOR`** 向负无穷
  - 原理：向数轴左侧舍入
  - 示例：`1.9` → `1`，`-1.1` → `-2`
  - 场景：游戏得分/分级，必须完全达到下一级分数才能升级

</details>

<details>
<summary>金融与进阶舍入</summary>

- **`ROUND_HALF_EVEN`** 银行家舍入
  - 原理：向最近的数字舍入；距离相等（5）则向偶数舍入
  - 示例：`2.5` → `2`，`3.5` → `4`
  - 场景：高频金融结算，长期进位和舍去各占一半，误差几乎为零

- **`ROUND_HALF_CEIL`**
  - 原理：遇到 5，向正无穷方向舍入
  - 示例：`1.5` → `2`，`-1.5` → `-1`

- **`ROUND_HALF_FLOOR`**
  - 原理：遇到 5，向负无穷方向舍入
  - 示例：`1.5` → `1`，`-1.5` → `-2`

</details>

## ❤️ 致谢

- [nzh](https://github.com/cnwhy/nzh)
- [bignumber.js](https://github.com/MikeMcl/bignumber.js)

## 📄 License

MIT License © [Frankie](https://github.com/tofrankie)

---

# Chinese Converter (English)

Convert numbers into Chinese uppercase RMB text.

## 🚀 Quick Start

Find the `Convert Number to RMB` command in Raycast, enter a number and press Enter to convert.

## 🌟 Examples

```
0 → 零元整
1 → 壹元整
10 → 壹拾元整
10024 → 壹万零贰拾肆元整
2354350320 → 贰拾叁亿伍仟肆佰叁拾伍万零叁佰贰拾元整

0.1 → 壹角
0.12 → 壹角贰分
1.236 → 壹元贰角肆分 (rounded to 1.24, 2 decimal places by default)
1000000.93 → 壹佰万元玖角叁分
```

## ⚙️ More Options

Enter `Convert Number to RMB` in Raycast, press `Cmd + K` to open the action panel, and select `Configure Command`.

### Always Show Yuan

By default, amounts below 1 yuan omit the "元" position:

```
0.1 → 壹角
0.12 → 壹角贰分
```

When enabled:

```
0.1 → 零元壹角
0.12 → 零元壹角贰分
```

### Use Traditional Yuan

Default uses "元". When enabled, uses "圆" (common in accounting):

```
1 → 壹元整          (default, uses 元)
1 → 壹圆整          (enabled, uses 圆)
```

### Append Zheng

By default:

```
1 → 壹元整
1.2 → 壹元贰角
1.23 → 壹元贰角叁分
```

When enabled, appends "整" when the amount stops at jiao (no fen):

```
1.2 → 壹元贰角整
1.23 → 壹元贰角叁分
```

> Per [会计基础工作规范](https://kjs.mof.gov.cn/gongzuotongzhi/202408/P020240801612534470745.pdf): when the amount stops at 元 or 角, append "整" or "正"; when there is 分, do not append.

### Use Simple Zheng

Default uses "整". When enabled, uses "正":

```
1 → 壹元整          (default, uses 整)
1 → 壹元正          (enabled, uses 正)
```

### Custom Prefix

Add custom text before the converted amount.

```
1.23 → 壹元贰角叁分
```

With prefix set to `人民币`:

```
1.23 → 人民币壹元贰角叁分
```

### Rounding Mode

Default is Round Half Up. Choose from these modes:

| Mode                            | Description                                     |
| :------------------------------ | :---------------------------------------------- |
| Round Half Up (四舍五入)        | Default. Round away from zero on 5              |
| Round Half Down (五舍六入)      | Round toward zero on 5                          |
| Round Up (向上取整)             | Always round away from zero                     |
| Round Down (向下取整)           | Truncate extra digits                           |
| Round Ceil (向正无穷取整)       | Round toward positive infinity                  |
| Round Floor (向负无穷取整)      | Round toward negative infinity                  |
| Round Half Even (银行家舍入)    | Round to nearest even on 5; standard in banking |
| Round Half Ceil (半正无穷取整)  | Round toward positive infinity on 5             |
| Round Half Floor (半负无穷取整) | Round toward negative infinity on 5             |

> If you are unsure, keep the default "Round Half Up".

<details>
<summary>Classic rounding (5 is the threshold)</summary>

- **`ROUND_HALF_UP`** Round Half Up
  - Principle: round away from 0 on 5
  - Example: `1.5` → `2`, `-1.5` → `-2`
  - Use case: standard math, retail, general calculations

- **`ROUND_HALF_DOWN`** Round Half Down
  - Principle: round toward 0 on 5
  - Example: `1.5` → `1`, `1.51` → `2`, `-1.5` → `-1`
  - Use case: specific industrial standards, slightly deflating statistics

</details>

<details>
<summary>Directional rounding (direction matters, not 5)</summary>

- **`ROUND_UP`** Away from zero
  - Principle: always round away from 0 if there are extra digits
  - Example: `1.1` → `2`, `-1.1` → `-2`
  - Use case: penalty pricing, charge the full unit for any excess

- **`ROUND_DOWN`** Toward zero
  - Principle: truncate the fractional part
  - Example: `1.9` → `1`, `-1.9` → `-1`
  - Use case: withdrawals, balance consumption

- **`ROUND_CEIL`** Toward positive infinity
  - Principle: round toward the right on the number line
  - Example: `1.1` → `2`, `-1.9` → `-1`
  - Use case: inventory restocking, need 1.1 boxes means prepare 2

- **`ROUND_FLOOR`** Toward negative infinity
  - Principle: round toward the left on the number line
  - Example: `1.9` → `1`, `-1.1` → `-2`
  - Use case: game scoring, must fully reach the next level to advance

</details>

<details>
<summary>Financial and advanced rounding</summary>

- **`ROUND_HALF_EVEN`** Banker's rounding
  - Principle: round to nearest; on ties (5), round to even
  - Example: `2.5` → `2`, `3.5` → `4`
  - Use case: high-frequency financial settlement, statistically unbiased

- **`ROUND_HALF_CEIL`**
  - Principle: on 5, round toward positive infinity
  - Example: `1.5` → `2`, `-1.5` → `-1`

- **`ROUND_HALF_FLOOR`**
  - Principle: on 5, round toward negative infinity
  - Example: `1.5` → `1`, `-1.5` → `-2`

</details>

## ❤️ Acknowledgments

- [nzh](https://github.com/cnwhy/nzh)
- [bignumber.js](https://github.com/MikeMcl/bignumber.js)

## 📄 License

MIT License © [Frankie](https://github.com/tofrankie)
