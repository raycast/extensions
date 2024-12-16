# EasyEng AI - Raycast 英文写作助手
https://www.raycast.com/pro?via=feng

## 功能描述

### 语言设置
- **目标语言**：英语（English）
- **原始语言**：中文（Chinese）
- **说明**：面向中文用户的英语写作辅助工具，支持中译英、英文补全和润色功能

### 权限检查
- **初始化检查**：
  1. 使用 `environment.canAccess(AI)` 检查用户是否有 Raycast AI Pro 权限
  2. 在首次进入页面时立即执行检查
  
- **检查结果处理**：
  - 有权限：正常展示所有功能
  - 无权限：
    1. 显示提示信息："需要 Raycast AI Pro 权限才能使用此功能"
    2. 提供升级链接：https://www.raycast.com/pro?via=feng
    3. 禁用所有 AI 相关功能

### 功能模块

#### 1. 智能补全
- **触发条件**：
  1. 输入至少2个英文字母
  2. 最后一段输入为英文字母
  3. 该英文部分不构成完整单词

- **输出要求**：
  - 数量：3个补全建议
  - 排序：按相关度降序排列
  - 类型：单个单词或短语


#### 2. 中英互译
- **触发条件**：

  1. 输入包含中文字符
  2. 可以是纯中文或中英混合

- **输出要求**：
  - 数量：1个翻译结果
  - 直译，保持原文句式结构


#### 3. 文本润色
- **触发条件**：
  1. 补全完成后
  2. 翻译完成后

- **输出样式**：
  1. 本地地道化：符合英语国家的表达习惯
  2. 日常口语化：适合日常交流的表达方式
  3. 正式表达：适合正式场合的表达方式


### 输出策略
指在什么场景调用上方的功能，以及输出组合是什么

#### 1. 单词补全场景

- 触发条件
  1. 输入至少2个英文字母
  2. 最后一段输入为英文字母
  3. 该英文部分不构成完整单词
  4. 总长度<=2个单词
- 输出组合
  输出：调用「智能补全」功能，将返回的 3 个结果拆开，分别展示 3 个结果
  示例：
    输入：'en'
    输出：['enter', 'english', 'ensure']


#### 2. 上下文补全场景

- 触发条件
  1. 输入至少2个英文字母
  2. 最后一段输入为英文字母
  3. 该英文部分不构成完整单词
  4. 总长度>2个单词
- 输出：
  - 调用「智能补全」功能，取前2个直接补全建议
  - 输入「智能补全」返回的第一个补全建议，调用「文本润色」功能，分别展示 3 个润色结果
- 示例：
  - 输入：'I need to imp'
  - 补全：['improve', 'implement']
  - 润色：
    - 标准：'I need to improve'
    - 口语：'I gotta improve'
    - 正式：'I must improve'


#### 3. 翻译场景

- 触发条件
  1. 输入包含中文字符
  2. 可以是纯中文或中英混合
- 输出：
  - 调用「翻译」功能，返回翻译结果
  - 输入翻译结果，调用「文本润色」功能，分别展示 3 个润色结果
- 示例：
  - 输入：'我需要提高 efficiency'
  - 直译'I need to improve efficiency'
  - 润色：
    - 标准：'I need to enhance my efficiency'
    - 口语：'I need to get more efficient'
    - 正式：'I must increase my efficiency'



## 技术逻辑
### AI 服务管理
- Raycast AI
- OpenRouter
- 期望在统一的地方，可以配置他们对应支持的模型（由人配置）；提示词& AI 相关逻辑统一处理

## 测试用例

### 1. 智能补全测试

#### 1.1 单词开头补全
```
# 基础英文补全
输入: "en"
期望输出: ["enter", "english", "ensure"]

输入: "imp"
期望输出: ["improve", "important", "implement"]

# 专业术语补全
输入: "algo"
期望输出: ["algorithm", "algorithmic", "algorithms"]

# 常见缩写补全
输入: "asap"
期望输出: ["ASAP", "as soon as possible", "as soon as practical"]
```

#### 1.2 上下文补全
```
# 动词补全
输入: "I want to imp"
期望输出: ["improve", "implement", "impress"]

# 形容词补全
输入: "The project is eff"
期望输出: ["efficient", "effective", "effortless"]

# 名词补全
输入: "We need more res"
期望输出: ["resources", "results", "research"]
```

### 2. 中英互译测试

#### 2.1 纯中文输入
```
# 简单句子
输入: "我需要帮助"
期望输出: "I need help"
润色变体:
  - 标准: "I need some assistance"
  - 口语: "I could use some help"
  - 正式: "I require assistance"

# 复杂句子
输入: "这个项目需要在下周完成"
期望输出: "This project needs to be completed next week"
润色变体:
  - 标准: "This project should be finished by next week"
  - 口语: "We gotta get this project done by next week"
  - 正式: "This project must be completed by next week"
```

#### 2.2 中英混合输入
```
# 简单混合
输入: "我的 computer 坏了"
期望输出: "My computer is broken"
润色变体:
  - 标准: "My computer isn't working"
  - 口语: "My computer's acting up"
  - 正式: "My computer is malfunctioning"

# 专业混合
输入: "需要优化 algorithm 的 performance"
期望输出: "Need to optimize the algorithm's performance"
润色变体:
  - 标准: "Need to enhance the algorithm's performance"
  - 口语: "Need to make the algorithm run better"
  - 正式: "The algorithm's performance requires optimization"
```

### 3. 文本润色测试

#### 3.1 简单表达润色
```
# 基础句子
输入: "I want to learn English"
期望输出:
  - 标准: "I want to improve my English skills"
  - 口语: "I wanna get better at English"
  - 正式: "I wish to enhance my English proficiency"

# 请求帮助
输入: "Can you help me"
期望输出:
  - 标准: "Could you please help me"
  - 口语: "Mind giving me a hand"
  - 正式: "Would you be able to assist me"
```

#### 3.2 商务场景润色
```
# 会议邀请
输入: "Let's have a meeting tomorrow"
期望��出:
  - 标准: "Let's schedule a meeting for tomorrow"
  - 口语: "Let's catch up tomorrow"
  - 正式: "I would like to propose a meeting for tomorrow"

# 项目反馈
输入: "The project is good"
期望输出:
  - 标准: "The project has shown positive results"
  - 口语: "The project's turning out great"
  - 正式: "The project has demonstrated satisfactory outcomes"
```

### 4. 边界情况测试

#### 4.1 特殊输入
```
# 数字混合
输入: "我需要买 2 个 apple"
期望输出: "I need to buy 2 apples"

# 标点符号
输入: "What's your name?"
期望补全: ["name", "named", "namely"]

# 重复词语
输入: "very very 好"
期望输出: "very very good"
```

#### 4.2 错误处理
```
# 单字母输入
输入: "a"
期望: 不触发补全

# 过长输入
输入: [超过1000字符的文本]
期望: 显示错误提示

# 特殊字符
输入: "@#$%"
期望: 保持原样，不触发处理
```

### 5. 组合场景测试
```
# 补全后润色
输入过程:
1. 输入: "I need to imp"
2. 选择补全: "improve"
3. 触发润色
期望输出:
  - 标准: "I need to enhance"
  - 口语: "I gotta get better"
  - 正式: "I must improve"

# 翻译后润色
输入过程:
1. 输入: "我想学习 programming"
2. 获得翻译: "I want to learn programming"
3. 触发润色
期望输出:
  - 标准: "I want to study programming"
  - 口语: "I wanna learn coding"
  - 正式: "I wish to acquire programming skills"
```

## 功能测试用例

### 1. 单词补全测试
```
# 完整示例
输入: "imp"
期望输出: 
  - 补全: ["improve", "important", "implement"]
  - 自动润色:
    标准: "improve the situation"
    口语: "make it better"
    正式: "enhance the condition"

# 其他测试输入
- "env"  # 环境相关
- "dev"  # 开发相关
- "ana"  # 分析相关
- "sys"  # 系统相关
- "pro"  # 专业相关
- "int"  # 国际/整数相关
- "com"  # 通信相关
- "str"  # 结构/字符串相关
```

### 2. 中英互译测试
```
# 完整示例
输入: "我需要优化这个 system 的 performance"
期望输出:
  - 直译: "I need to optimize this system's performance"
  - 自动润色:
    标准: "I need to enhance this system's performance"
    口语: "I need to make this system run better"
    正式: "I must improve this system's performance metrics"

# 其他测试输入
- "请帮我 review 这份 document"
- "这个 bug 需要立即 fix"
- "下周的 meeting 改到下午 3 点"
- "我们需要一个新的 solution"
- "这个 feature 还在 testing 阶段"
- "麻烦帮我 check 一下 code"
- "今天的 presentation 准备好了吗"
- "数据 backup 很重要"
```

### 3. 文本润色测试
```
# 完整示例
输入: "The function is not working properly"
期望输出:
  标准: "The function is experiencing issues"
  口语: "The function's acting up"
  正式: "The function is not performing as expected"

# 其他测试输入
- "I can't solve this problem"
- "The code has many bugs"
- "We need to finish this quickly"
- "This is a good solution"
- "The meeting was productive"
- "I don't understand the requirement"
- "The project is delayed"
- "We should improve the design"
```

## 组合场景测试

### 1. 开发场景
```
# 完整示例
输入过程: 
1. "这个 fun" → 补全 "function"
2. 自动润色结果:
   标准: "This function"
   口语: "This piece of code"
   正式: "This functionality"

# 其他测试流程
- "代码需要 ref" → 补全/润色
- "这个 var 的 val" → 补全/润色
- "我们要添加新的 fea" → 补全/润色
- "数据库需要 opt" → 补全/润色
```

### 2. 商务场景
```
# 完整示例
输入过程:
1. "下周的 pres" → 补全 "presentation"
2. 自动润色结果:
   标准: "Next week's presentation"
   口语: "Next week's talk"
   正式: "The presentation scheduled for next week"

# 其他测试流程
- "请准备一下 meet" → 补全/润色
- "我刚收到一个 prop" → 补全/润色
- "团队需要做 brain" → 补全/润色
- "这个项目的 dead" → 补全/润色
```

### 3. 长句组合测试
```
# 完整示例
输入过程:
1. "我们需要为这个项目制定一个详细的 imp plan，并且做好 risk man"
2. 补全: "implementation plan", "risk management"
3. 自动润色结果:
   标准: "We need to develop a detailed implementation plan and establish risk management"
   口语: "We need to work out a solid plan and handle the risks"
   正式: "We must formulate a comprehensive implementation plan and institute risk management protocols"

# 其他测试流程
- "这个季度的 sales per 不太理想，需要新的 mar str" → 补全/润色
- "请帮我检查一下 sys per，并准备一份 tech rep" → 补全/润色
- "团队需要更好的 col env，提高 work eff" → 补全/润色
- "新项目需要做好 req ana 和 sys des" → 补全/润色
```

### 4. 特殊场景测试
```
# 完整示例
输入过程:
1. "CI/CD pip" → 补全 "pipeline"
2. 自动润色结果:
   标准: "CI/CD pipeline"
   口语: "build and deploy setup"
   正式: "Continuous Integration and Deployment pipeline"

# 其他测试流程
- "API doc" → 补全/润色
- "UI/UX des" → 补全/润色
- "ML mod" → 补全/润色
- "DB opt" → 补全/润色
```