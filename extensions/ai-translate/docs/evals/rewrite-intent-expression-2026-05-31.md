# Rewrite Intent-Expression Prompt Eval

Date: 2026-05-31T14:20:49.374Z
Provider: Xiaomi MiMo
Model: mimo-v2.5
Temperature: 0

Rubric: Native English, Intent fidelity, No Chinese calque, Direct utterance, Register fit, No unsupported addition, Brevity. Score each item 1-5.

## 委婉催文件

Source: 我想委婉地提醒对方，今天下午之前把文件发我，不要显得太催。

### Baseline

Just a friendly reminder — could you send the file over by this afternoon? No rush, but I'd appreciate it.

Duration: 3133 ms

Why:

- 用 "Just a friendly reminder" 开头，比直接说 "I want to remind you" 更委婉自然，符合英语母语者在职场中轻柔提醒的习惯。
- "send the file over" 是地道的口语搭配，比 "send me the file" 更随意亲切。
- "No rush, but I'd appreciate it" 既表达了不催促的礼貌，又暗示了时间要求，比直译 "不要显得太催" 更符合英语的表达逻辑。

### Candidate A

Just a friendly reminder to send over the file by this afternoon if possible.

Duration: 3921 ms

Why:

- 使用 "Just a friendly reminder" 作为委婉提醒的开头，比直接说 "I want to remind you" 更自然、更符合英语习惯。
- 加入 "if possible" 作为缓冲，使语气更柔和，避免显得强硬或催促。
- 省略了 "不要显得太催" 的直译，因为英语中通过 "friendly" 和 "if possible" 已经自然传达了委婉的语气，无需额外说明。

### Candidate B

Just a friendly reminder to send over the files by this afternoon.

Duration: 2176 ms

Why:

- 用 "Just a friendly reminder" 开头，既委婉又自然，符合英语母语者的表达习惯。
- 直接点明 "by this afternoon"，清晰传达了截止时间，没有模糊化。
- 整体语气轻松友好，避免了生硬的催促感，同时保持了信息的明确性。

## 不归责地解释

Source: 我想跟外国同事说，这事不是你做得不好，是我们之前没有把要求讲清楚。

### Baseline

Hey, this isn't about you doing a bad job. We just didn't explain the requirements clearly enough from the start.

Duration: 3375 ms

Why:

- 用 "Hey" 开头比直接说 "I want to tell you" 更自然，符合英语口语中轻松、直接的沟通习惯。
- "this isn't about you doing a bad job" 比 "this is not you doing poorly" 更地道，"do a bad job" 是常见搭配，语气也更委婉。
- "from the start" 替代 "before"，更具体地表达了“一开始就没说清楚”的意思，听起来更像母语者的表达。
- 整体句子结构更紧凑，避免了中文里常见的“是我们之前没有把要求讲清楚”这种稍显冗长的表述，更符合英语简洁的节奏。

### Candidate A

This isn't about you doing a bad job. We didn't make the requirements clear enough beforehand.

Duration: 2763 ms

Why:

- 直接表达核心意思，避免了中文里“我想跟...说”这种元语言结构，更符合英语直接沟通的习惯。
- 使用了更地道的表达，如“make the requirements clear enough”，而不是直译“把要求讲清楚”。
- 语气直接但友善，用“This isn't about...”开头，比“This is not because you...”更自然，能有效减轻对方的防御心理。

### Candidate B

This isn't about you doing a bad job. We didn't make the requirements clear from the start.

Duration: 3915 ms

Why:

- 直接以核心信息开头，省略了“我想跟外国同事说”这类中文常见的铺垫。
- 用 “This isn't about you...” 替代了 “这事不是你做得不好”，更符合英语中澄清误会的自然表达。
- “We didn't make the requirements clear” 比 “我们没有把要求讲清楚” 更简洁地道，避免了逐字翻译的生硬感。

## 服务场景请求

Source: 我想跟酒店前台说，房间里的空调声音太大了，能不能换一个安静一点的房间。

### Baseline

Hi, I'm calling from my room. The air conditioner is really loud. Would it be possible to switch to a quieter room?

Duration: 3397 ms

Why:

- 用 "Hi, I'm calling from my room" 开头，比直接说 "I want to..." 更符合英语电话沟通的习惯，显得礼貌且自然。
- 将 "声音太大了" 译为 "is really loud"，比 "the sound is too big" 更地道，符合英语描述噪音的常用表达。
- 用 "Would it be possible to..." 提出请求，比 "can I..." 更委婉、更符合酒店场景的礼貌语气。
- 将 "换一个安静一点的房间" 译为 "switch to a quieter room"，"switch to" 比 "change to" 更口语化，"quieter" 比 "more quiet" 更自然。

### Candidate A

The air conditioner in my room is quite loud. Would it be possible to switch to a quieter room?

Duration: 3237 ms

Why:

- 直接陈述问题（The air conditioner... is quite loud）比“I want to say...”更符合英语沟通习惯，开门见山。
- 使用“Would it be possible to...”提出请求，比“Can you...”更礼貌且正式，适合酒店前台场景。
- 用“switch to a quieter room”替代“换一个安静一点的房间”，更地道简洁，避免了“换一个”的直译。

### Candidate B

The air conditioner in my room is really loud. Could I switch to a quieter room?

Duration: 3951 ms

Why:

- 直接陈述问题并提出请求，符合英语中向酒店前台反映问题的常见表达方式。
- 使用 "really loud" 比 "声音太大" 更口语化、更自然。
- "Could I switch to..." 是礼貌且直接的请求句型，比 "能不能换一个..." 更地道。

## 学术/导师沟通

Source: 我想跟导师说，材料我已经基本写完了，但还想再核对一下数据，能不能明天上午发给他。

### Baseline

I wanted to let my advisor know that I've basically finished writing the materials, but I'd like to double-check the data one more time. Would it be okay if I send them to him tomorrow morning?

Duration: 5477 ms

Why:

- “我想跟导师说” 译为 “I wanted to let my advisor know that”，比 “I want to tell my advisor” 更委婉、自然，符合向导师汇报时的礼貌语气。
- “基本写完了” 用 “basically finished writing” 比 “almost completed” 更口语化，是日常对话中的常见表达。
- “核对一下数据” 译为 “double-check the data one more time”，其中 “double-check” 是地道的动词搭配，比 “verify” 或 “check again” 更生动。
- “能不能明天上午发给他” 用 “Would it be okay if I send them to him tomorrow morning?” 这种委婉的请求句式，比直接问 “Can I send...” 更礼貌，符合与导师沟通的语境。

### Candidate A

I've mostly finished the materials, but I'd like to double-check the data. Would it be possible to send them to you tomorrow morning?

Duration: 3363 ms

Why:

- 将“我想跟导师说”转化为直接引语，符合英语沟通习惯，避免了“I want to tell...”这类元语言。
- 使用“I've mostly finished”和“I'd like to”来表达完成状态和意愿，比直译“基本写完了”和“还想”更自然。
- 用“Would it be possible to...”来提出请求，比直译“能不能”更礼貌且符合英语中提出请求的惯用方式。
- 将“发给他”具体化为“send them to you”，明确了动作对象（材料）和接收者（导师），使表达更清晰。

### Candidate B

I've mostly finished the materials, but I'd like to double-check the data. Could I send them to you tomorrow morning?

Duration: 2585 ms

Why:

- 将“我想跟导师说”转化为直接对话，符合英语沟通习惯。
- 用“mostly finished”替代“基本写完了”，更口语化。
- “double-check the data”比“核对一下数据”更自然。
- 用“Could I...”提出请求，礼貌且直接。

## 拒绝或改期

Source: 我想礼貌地说今天不太方便开会，能不能改到明天下午。

### Baseline

I'm afraid I can't make the meeting today. Would it be possible to reschedule for tomorrow afternoon?

Duration: 3009 ms

Why:

- 用 "I'm afraid I can't make the meeting" 替代了直译的 "今天不太方便开会"，更符合英语母语者表达拒绝时的委婉习惯。
- 使用 "Would it be possible to reschedule for..." 这个地道句型来提出改期请求，比 "能不能改到" 更礼貌、更自然。
- 将 "明天下午" 具体化为 "tomorrow afternoon"，并整合进请求句中，使整个表达更流畅、完整。

### Candidate A

Would it be possible to reschedule the meeting to tomorrow afternoon? Today isn't a good time for me.

Duration: 3390 ms

Why:

- 使用 "Would it be possible to..." 是地道且礼貌的请求方式，比 "I want to say..." 更直接自然。
- 将 "今天不太方便开会" 转化为 "Today isn't a good time for me"，更符合英语中表达个人日程冲突的习惯，避免了中式直译。
- 整体语气清晰、简洁，既表达了歉意（通过请求而非陈述），又直接提出了改期建议，符合商务沟通的效率要求。

### Candidate B

Would it be possible to reschedule the meeting to tomorrow afternoon? Today isn't a great time for me.

Duration: 3517 ms

Why:

- 直接表达请求，用 "Would it be possible to..." 比 "I want to say..." 更自然。
- 用 "reschedule" 替代 "change"，更符合商务场景。
- 用 "isn't a great time for me" 比 "不太方便" 更口语化，避免生硬翻译。

## 轻微异议

Source: 我想说我理解他的观点，但这个方案可能会让后续维护变复杂。

### Baseline

I see where he's coming from, but this approach could make maintenance a real headache down the road.

Duration: 5019 ms

Why:

- 用 "I see where he's coming from" 替代 "我想说我理解他的观点"，这是英语母语者表达理解对方立场时非常地道的口语化说法，避免了直译的生硬感。
- 用 "this approach" 替代 "这个方案"，在技术讨论中更自然、更常用。
- 用 "could make maintenance a real headache" 替代 "可能会让后续维护变复杂"，"a real headache" 是一个非常地道的比喻，生动地表达了“麻烦、棘手”的意思，比直译的“变复杂”更符合英语母语者的表达习惯。
- 用 "down the road" 替代 "后续"，这是一个常见的口语化时间状语，意为“将来、以后”，使句子节奏更流畅自然。

### Candidate A

I understand his point, but this approach could make future maintenance more complicated.

Duration: 2566 ms

Why:

- 直接表达观点，避免了“我想说”这类元语言，更符合英语口语习惯。
- 用“approach”替代“方案”，更自然地道。
- “make future maintenance more complicated”比“让后续维护变复杂”更符合英语的动宾搭配和节奏。

### Candidate B

I see his point, but this approach could make future maintenance more complicated.

Duration: 2869 ms

Why:

- “I see his point” 比 “I understand his viewpoint” 更口语化，更自然。
- “approach” 比 “solution” 或 “plan” 在这里更贴切，指代“方案”的方式。
- “could make... more complicated” 用情态动词和比较级，语气委婉但清晰，符合提出顾虑的语境。

## Manual Scoring

| Sample        | Variant     | Native English | Intent fidelity | No Chinese calque | Direct utterance | Register fit | No unsupported addition | Brevity | Total | Notes                                                                                 |
| ------------- | ----------- | -------------: | --------------: | ----------------: | ---------------: | -----------: | ----------------------: | ------: | ----: | ------------------------------------------------------------------------------------- |
| 委婉催文件    | Baseline    |              5 |               4 |                 5 |                5 |            5 |                       2 |       4 |    30 | Adds `No rush`, which conflicts with a same-afternoon deadline.                       |
| 委婉催文件    | Candidate A |              4 |               3 |                 5 |                4 |            4 |                       3 |       5 |    28 | `if possible` makes the deadline too optional.                                        |
| 委婉催文件    | Candidate B |              4 |               5 |                 5 |                5 |            5 |                       4 |       5 |    33 | Keeps `by this afternoon`; slight plural drift from `file` to `files`.                |
| 不归责地解释  | Baseline    |              5 |               5 |                 5 |                5 |            4 |                       3 |       4 |    31 | `Hey` is an unsupported opener and may be too casual.                                 |
| 不归责地解释  | Candidate A |              5 |               5 |                 5 |                5 |            5 |                       5 |       5 |    35 | Best output for this sample.                                                          |
| 不归责地解释  | Candidate B |              5 |               4 |                 5 |                5 |            5 |                       5 |       5 |    34 | Clean and direct, though less explicit than `clear enough`.                           |
| 服务场景请求  | Baseline    |              5 |               5 |                 5 |                5 |            5 |                       2 |       3 |    30 | Adds `Hi` and a room-call frame not present in the source.                            |
| 服务场景请求  | Candidate A |              5 |               5 |                 5 |                5 |            5 |                       5 |       4 |    34 | Natural, but slightly more formal.                                                    |
| 服务场景请求  | Candidate B |              5 |               5 |                 5 |                5 |            5 |                       5 |       5 |    35 | Best balance of directness, politeness, and brevity.                                  |
| 学术/导师沟通 | Baseline    |              4 |               3 |                 3 |                1 |            4 |                       3 |       2 |    20 | Keeps the meta-frame by talking about `my advisor` instead of addressing the advisor. |
| 学术/导师沟通 | Candidate A |              4 |               4 |                 5 |                5 |            5 |                       5 |       4 |    32 | Direct, but `Would it be possible to send...` is less precise than asking permission. |
| 学术/导师沟通 | Candidate B |              5 |               5 |                 5 |                5 |            5 |                       5 |       5 |    35 | Directly addresses the advisor and preserves tomorrow morning.                        |
| 拒绝或改期    | Baseline    |              5 |               5 |                 5 |                5 |            5 |                       5 |       5 |    35 | Already strong on this sample.                                                        |
| 拒绝或改期    | Candidate A |              5 |               5 |                 5 |                5 |            5 |                       5 |       5 |    35 | Equivalent to Candidate B here.                                                       |
| 拒绝或改期    | Candidate B |              5 |               5 |                 5 |                5 |            5 |                       5 |       5 |    35 | Equivalent to Candidate A here.                                                       |
| 轻微异议      | Baseline    |              5 |               3 |                 5 |                5 |            4 |                       2 |       4 |    28 | `a real headache down the road` is vivid but stronger than the source.                |
| 轻微异议      | Candidate A |              4 |               5 |                 5 |                5 |            5 |                       5 |       5 |    34 | Accurate, though `I understand his point` is less idiomatic.                          |
| 轻微异议      | Candidate B |              5 |               5 |                 5 |                5 |            5 |                       5 |       5 |    35 | Best balance of idiom and restraint.                                                  |

## Decision

Candidate B wins overall: Baseline 174/210, Candidate A 198/210, Candidate B 207/210.

I selected Candidate B because it fixes the largest baseline failures without making the prompt overbearing: it removes Chinese meta-framing, preserves concrete constraints, addresses the listener directly, and blocks unsupported greetings, apologies, placeholders, concessions, and deadline-softening. Candidate A was also strong, but it was more likely to add softeners such as `if possible` or `possibly`, which weakened clear constraints.

## Residual Risks

- MiMo can still drift on number (`file` to `files`) when Chinese is ambiguous.
- Hotel and service scenarios are prone to automatic greetings; the chosen prompt now bans them explicitly, but provider behavior should be spot-checked after future model changes.
- The prompt improves Rewrite/Coach only. General translation remains meaning-first and is intentionally not turned into an intent-expression command.
