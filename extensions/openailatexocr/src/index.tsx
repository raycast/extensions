import { environment, closeMainWindow, getPreferenceValues, Clipboard, showHUD, LocalStorage } from "@raycast/api";
import { join } from "path";
import { execSync } from "child_process";
import fs from "fs";
import OpenAI from "openai";

export default async () => {
  await closeMainWindow();
  const savePath = join(environment.supportPath, "capture.png");

  execSync(`/usr/sbin/screencapture -i '${savePath}'`);
  // 检查文件是否存在
  if (!fs.existsSync(savePath)) {
    await showHUD("❌ Screenshot failed");
    return;
  }

  try {
    // 读取图片并转换为 base64
    const file = fs.readFileSync(savePath);
    const base64Image = file.toString("base64");

    // 获取 OpenAI API 密钥和输出格式
    const preferences = getPreferenceValues();
    const apiKey = preferences.token;
    const base = preferences.base;
    const model = preferences.model;
    const outputFormat = (await LocalStorage.getItem<string>("format")) ?? "md"; // 默认为 md

    // 实例化 OpenAI 客户端
    let openai;
    if (base) {
      openai = new OpenAI({
        apiKey: apiKey,
        baseURL: base,
      });
    } else {
      openai = new OpenAI({
        apiKey: apiKey,
      });
    }

    // 构建提示，根据输出格式调整
    let promptText;
    let functions;

    if (outputFormat === "latex") {
      promptText =
        "你是一个专业的LaTeX OCR工具。请分析图片中的内容并提取所有数学表达式、公式和文本。输出应该是一个纯LaTeX文档，无需任何解释或格式指导。可以使用任何LaTeX命令和包（你应当假设基础的包已经被导入）。";

      // functions = [
      //   {
      //     name: "extract_latex",
      //     description: "提取图片中的LaTeX代码",
      //     parameters: {
      //       type: "object",
      //       properties: {
      //         latex_code: {
      //           type: "string",
      //           description: "纯LaTeX代码，不含任何包装或解释",
      //         },
      //       },
      //       required: ["latex_code"],
      //     },
      //   },
      // ];
    } else {
      // md format
      promptText =
        "你是一个专业的数学OCR工具。请分析图片中的内容并提取所有数学表达式、公式和文本。对于数学公式，使用KaTeX兼容的命令，并用$$\n...\n$$包裹。输出应该是纯粹的内容还原，不需要任何解释或注释。";

      // functions = [
      //   {
      //     name: "extract_markdown_with_latex",
      //     description: "提取图片中的内容为Markdown，数学公式用$$包裹",
      //     parameters: {
      //       type: "object",
      //       properties: {
      //         markdown_content: {
      //           type: "string",
      //           description: "纯Markdown内容，数学公式用$$包裹，不含任何解释",
      //         },
      //       },
      //       required: ["markdown_content"],
      //     },
      //   },
      // ];
    }

    // 调用 OpenAI API
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: promptText,
            },
            {
              type: "image_url",
              image_url: { url: `data:image/png;base64,${base64Image}` },
            },
          ],
        },
      ],
      functions: functions,
      // function_call: { name: outputFormat === "latex" ? "extract_latex" : "extract_markdown_with_latex" },
      stream: false,
    });

    // 提取结果
    let result;
    if (response.choices[0].message.function_call) {
      const functionCall = response.choices[0].message.function_call;
      const args = JSON.parse(functionCall.arguments);
      result = outputFormat === "latex" ? args.latex_code : args.markdown_content;
    } else {
      result = response.choices[0].message.content;
    }

    // 复制到剪贴板
    if (result) {
      await Clipboard.copy(result);
      await showHUD(`✅ Content extracted (${outputFormat.toUpperCase()} format)`);
    } else {
      await showHUD("⚠️ No content could be extracted from the image");
    }

    // 清理临时文件
    fs.unlinkSync(savePath);
  } catch (err) {
    console.log(err);
    let errorMessage = "Unknown error";
    if (err instanceof Error) {
      errorMessage = err.message;
    }

    await showHUD(`❌ Error: ${errorMessage}`);
    // 清理临时文件
    if (fs.existsSync(savePath)) {
      fs.unlinkSync(savePath);
    }
  }
};
