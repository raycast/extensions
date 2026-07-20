# Chinese Converter

English | [中文](https://github.com/tofrankie/raycast-chinese-converter/blob/main/README.zh-CN.md)

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

### Auto Read Clipboard

When enabled, if no number is provided through the command argument, the command reads clipboard text on launch, fills the search box, and converts it immediately.

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

| Mode             | Description                                     |
| :--------------- | :---------------------------------------------- |
| Round Half Up    | Default. Round away from zero on 5              |
| Round Half Down  | Round toward zero on 5                          |
| Round Up         | Always round away from zero                     |
| Round Down       | Truncate extra digits                           |
| Round Ceil       | Round toward positive infinity                  |
| Round Floor      | Round toward negative infinity                  |
| Round Half Even  | Round to nearest even on 5; standard in banking |
| Round Half Ceil  | Round toward positive infinity on 5             |
| Round Half Floor | Round toward negative infinity on 5             |

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
