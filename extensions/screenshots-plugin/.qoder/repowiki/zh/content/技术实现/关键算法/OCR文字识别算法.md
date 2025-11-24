# OCR文字识别算法

<cite>
**本文引用的文件**
- [test_ocr.m](file://test_ocr.m)
- [FloatWindow.m](file://FloatWindow.m)
- [README.md](file://README.md)
- [build-native.sh](file://build-native.sh)
- [package.json](file://package.json)
- [get_mouse_position.m](file://get_mouse_position.m)
</cite>

## 目录
1. [引言](#引言)
2. [项目结构](#项目结构)
3. [核心组件](#核心组件)
4. [架构总览](#架构总览)
5. [详细组件分析](#详细组件分析)
6. [依赖关系分析](#依赖关系分析)
7. [性能考量](#性能考量)
8. [故障排查指南](#故障排查指南)
9. [结论](#结论)
10. [附录](#附录)

## 引言
本文件围绕基于Vision框架的OCR文字识别实现进行全面解析，重点覆盖以下方面：
- VNRecognizeTextRequest的关键参数：识别级别、语言列表、最小文本高度等
- 置信度阈值过滤与候选容错策略
- 从NSImage到CGImage的转换流程
- 同步识别的线程安全考虑
- 结果拼接与空白字符清理
- 提升OCR准确性的实践建议

该实现同时包含独立的测试程序与Raycast插件的原生悬浮窗应用，二者均采用相同的OCR识别流程。

**章节来源**
- [README.md](file://README.md#L1-L61)

## 项目结构
该项目由前端脚本与原生Objective-C应用组成，其中原生应用负责悬浮窗口展示与OCR识别，前端通过脚本调用原生二进制。

```mermaid
graph TB
subgraph "前端"
pkg["package.json<br/>脚本与依赖"]
readme["README.md<br/>功能与技术说明"]
end
subgraph "原生应用"
fw["FloatWindow.m<br/>悬浮窗+OCR识别"]
tocr["test_ocr.m<br/>独立OCR测试"]
gmp["get_mouse_position.m<br/>鼠标位置获取"]
bns["build-native.sh<br/>编译脚本"]
end
pkg --> fw
pkg --> tocr
pkg --> gmp
bns --> fw
bns --> tocr
bns --> gmp
readme --> fw
```

**图表来源**
- [package.json](file://package.json#L1-L34)
- [README.md](file://README.md#L1-L61)
- [FloatWindow.m](file://FloatWindow.m#L1-L56)
- [test_ocr.m](file://test_ocr.m#L1-L41)
- [get_mouse_position.m](file://get_mouse_position.m#L1-L10)
- [build-native.sh](file://build-native.sh#L1-L26)

**章节来源**
- [package.json](file://package.json#L1-L34)
- [README.md](file://README.md#L1-L61)
- [build-native.sh](file://build-native.sh#L1-L26)

## 核心组件
- 浮动窗口与OCR识别器：在悬浮窗口应用中，识别函数负责将NSImage转换为CGImage，配置VNRecognizeTextRequest并执行同步识别，随后对结果进行拼接与清洗。
- 独立OCR测试：提供最小可运行的命令行入口，验证识别流程与结果输出。
- 原生编译：通过构建脚本链接Cocoa、Vision、QuartzCore、ImageIO等框架生成可执行文件。

关键实现要点：
- 识别级别：使用高精度识别级别以提升准确性
- 多语言支持：配置中英繁体语言集合
- 最小文本高度：设置为0以启用自动检测
- 置信度阈值：仅保留置信度高于阈值的结果
- 候选容错：取topCandidates:3，优先采用置信度最高的候选
- 结果拼接：按行追加换行符，最终去除首尾空白字符

**章节来源**
- [FloatWindow.m](file://FloatWindow.m#L85-L177)
- [test_ocr.m](file://test_ocr.m#L1-L92)
- [build-native.sh](file://build-native.sh#L1-L26)

## 架构总览
下图展示了从图像输入到识别结果输出的整体流程，包括图像转换、请求配置、识别执行、结果处理与输出。

```mermaid
sequenceDiagram
participant Caller as "调用方"
participant NSImg as "NSImage"
participant Conv as "图像转换"
participant VNR as "VNRecognizeTextRequest"
participant Handler as "VNImageRequestHandler"
participant Obs as "识别观察结果"
participant Out as "输出字符串"
Caller->>NSImg : "加载图片"
Caller->>Conv : "尝试CGImageForProposedRect"
alt "转换失败"
Conv->>NSImg : "读取TIFF数据"
Conv->>Conv : "从ImageSource提取CGImage"
end
Caller->>VNR : "配置识别级别/语言/最小文本高度"
Caller->>Handler : "初始化并执行识别"
Handler-->>Obs : "返回识别结果数组"
Caller->>Out : "遍历候选，按置信度阈值拼接并清洗"
Out-->>Caller : "返回最终文本"
```

**图表来源**
- [FloatWindow.m](file://FloatWindow.m#L85-L177)
- [test_ocr.m](file://test_ocr.m#L1-L92)

## 详细组件分析

### 组件A：图像到CGImage的转换流程
- 优先使用NSImage的内置转换接口；若失败则回退到读取TIFF表示并从ImageSource中提取CGImage
- 释放策略：仅在成功从ImageSource创建CGImage时标记释放，避免重复释放

```mermaid
flowchart TD
Start(["开始"]) --> TryCG["尝试 CGImageForProposedRect"]
TryCG --> CGOK{"是否成功?"}
CGOK --> |是| UseCG["使用CGImage"]
CGOK --> |否| ReadTIFF["读取NSImage TIFFRepresentation"]
ReadTIFF --> HasTIFF{"是否有TIFF数据?"}
HasTIFF --> |否| Fail["返回空"]
HasTIFF --> |是| FromSrc["从ImageSource创建CGImage"]
FromSrc --> SrcOK{"创建成功?"}
SrcOK --> |否| Fail
SrcOK --> |是| UseCG
UseCG --> End(["结束"])
Fail --> End
```

**图表来源**
- [FloatWindow.m](file://FloatWindow.m#L85-L122)
- [test_ocr.m](file://test_ocr.m#L1-L41)

**章节来源**
- [FloatWindow.m](file://FloatWindow.m#L85-L122)
- [test_ocr.m](file://test_ocr.m#L1-L41)

### 组件B：VNRecognizeTextRequest配置与执行
- 识别级别：高精度
- 语言列表：包含简体中文、繁体中文、英式英语与美式英语
- 最小文本高度：0（自动检测）
- 语言纠正：开启
- 执行方式：同步识别，直接在主线程调用
- 错误处理：捕获并记录错误，返回空结果

```mermaid
classDiagram
class VNRecognizeTextRequest {
+recognitionLevel
+recognitionLanguages
+minimumTextHeight
+usesLanguageCorrection
+performRequests(error)
+results
}
class VNImageRequestHandler {
+initWithCGImage(options)
+performRequests(requests,error)
}
VNRecognizeTextRequest --> VNImageRequestHandler : "被处理器执行"
```

**图表来源**
- [FloatWindow.m](file://FloatWindow.m#L108-L122)
- [test_ocr.m](file://test_ocr.m#L27-L41)

**章节来源**
- [FloatWindow.m](file://FloatWindow.m#L108-L122)
- [test_ocr.m](file://test_ocr.m#L27-L41)

### 组件C：结果拼接与清洗
- 遍历识别结果，获取topCandidates:3
- 仅保留置信度高于阈值的候选
- 按行追加换行符进行拼接
- 最终去除首尾空白与换行字符

```mermaid
flowchart TD
RStart(["开始"]) --> LoopObs["遍历识别结果"]
LoopObs --> GetTop["获取topCandidates:3"]
GetTop --> HasCand{"候选数量>0?"}
HasCand --> |否| NextObs["下一个结果"]
HasCand --> |是| Top["取置信度最高候选"]
Top --> CheckConf{"置信度>阈值?"}
CheckConf --> |否| NextObs
CheckConf --> |是| Append["追加换行符(如需)+候选字符串"]
Append --> NextObs
NextObs --> DoneObs{"还有结果吗?"}
DoneObs --> |是| LoopObs
DoneObs --> |否| Trim["去除首尾空白与换行"]
Trim --> REnd(["结束"])
```

**图表来源**
- [FloatWindow.m](file://FloatWindow.m#L121-L177)
- [test_ocr.m](file://test_ocr.m#L40-L92)

**章节来源**
- [FloatWindow.m](file://FloatWindow.m#L121-L177)
- [test_ocr.m](file://test_ocr.m#L40-L92)

### 组件D：线程安全与同步识别
- 当前实现使用同步识别接口，直接在主线程调用
- 由于Vision识别在本地执行且为单次请求，未见显式并发控制
- 若在UI线程长时间阻塞，可能影响界面响应；建议在后台队列执行识别并在主线程更新UI

```mermaid
sequenceDiagram
participant UI as "主线程/UI"
participant Req as "VNRecognizeTextRequest"
participant Hdl as "VNImageRequestHandler"
UI->>Req : "配置请求"
UI->>Hdl : "performRequests(同步)"
Hdl-->>UI : "返回结果/错误"
UI->>UI : "更新界面或处理结果"
```

**图表来源**
- [FloatWindow.m](file://FloatWindow.m#L119-L122)
- [test_ocr.m](file://test_ocr.m#L38-L41)

**章节来源**
- [FloatWindow.m](file://FloatWindow.m#L119-L122)
- [test_ocr.m](file://test_ocr.m#L38-L41)

## 依赖关系分析
- 原生应用依赖系统框架：Cocoa、Vision、Carbon、QuartzCore、ImageIO
- 构建脚本统一链接上述框架并生成可执行文件
- 前端通过package.json脚本在构建阶段复制原生二进制

```mermaid
graph LR
fw["FloatWindow.m"] --> V["Vision.framework"]
fw --> C["Cocoa.framework"]
fw --> Q["QuartzCore.framework"]
fw --> I["ImageIO.framework"]
fw --> Car["Carbon.framework"]
tocr["test_ocr.m"] --> V
tocr --> C
tocr --> I
bns["build-native.sh"] --> fw
bns --> tocr
bns --> gmp["get_mouse_position.m"]
```

**图表来源**
- [FloatWindow.m](file://FloatWindow.m#L1-L56)
- [test_ocr.m](file://test_ocr.m#L1-L41)
- [get_mouse_position.m](file://get_mouse_position.m#L1-L10)
- [build-native.sh](file://build-native.sh#L1-L26)

**章节来源**
- [build-native.sh](file://build-native.sh#L1-L26)
- [package.json](file://package.json#L1-L34)

## 性能考量
- 识别级别：高精度识别通常带来更好的准确率，但可能增加耗时
- 语言列表：包含多种语言会增加模型匹配开销，建议根据实际场景裁剪语言集
- 最小文本高度：设置为0可自动检测，避免人为设定导致误判
- 候选数与阈值：topCandidates:3与置信度阈值共同降低误识别风险，但可能遗漏低置信度但正确的文本
- 图像质量：清晰、无模糊、无倾斜的截图可显著提升识别效果
- 线程模型：同步识别在UI线程可能导致卡顿，建议异步执行并回调更新UI

[本节为通用性能讨论，无需具体文件引用]

## 故障排查指南
- 无法加载图片：检查输入路径与权限
- 识别为空：确认图像包含可识别文本；检查语言列表是否覆盖目标语言
- 识别错误：查看错误日志；确认CGImage转换是否成功
- 界面卡顿：将识别移至后台队列执行

**章节来源**
- [test_ocr.m](file://test_ocr.m#L74-L92)
- [FloatWindow.m](file://FloatWindow.m#L119-L122)

## 结论
本实现以Vision框架为核心，通过高精度识别、多语言支持与自动文本高度检测，结合置信度阈值与候选容错策略，实现了较为稳健的OCR识别流程。图像转换与结果拼接清洗逻辑清晰，便于维护与扩展。为进一步提升用户体验，建议在后台线程执行识别并在主线程更新UI，同时根据实际使用场景优化语言列表与阈值设置。

[本节为总结性内容，无需具体文件引用]

## 附录

### A. 参数与策略对照表
- 识别级别：高精度
- 识别语言：简体中文、繁体中文、英式英语、美式英语
- 最小文本高度：0（自动检测）
- 置信度阈值：>0.1
- 候选数量：3
- 结果拼接：按行追加换行符
- 清洗规则：去除首尾空白与换行

**章节来源**
- [FloatWindow.m](file://FloatWindow.m#L108-L177)
- [test_ocr.m](file://test_ocr.m#L27-L92)

### B. 实践建议
- 截图文字区域应清晰、锐利，避免模糊或过度抖动
- 避免倾斜与严重透视变形，尽量保持水平
- 减少背景干扰，突出文字区域
- 根据实际使用场景调整语言列表，减少不必要的语言匹配
- 对于长文本，建议在UI层提供滚动与复制功能，提升可用性

[本节为通用建议，无需具体文件引用]