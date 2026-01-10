import { describe, it, expect } from "vitest";
import { FormatterService } from "../src/services/formatter-service";

describe("原始问题验证", () => {
    const formatter = new FormatterService();

    it("应该正确格式化你提到的 case", () => {
        const input = `### 构建与开发
- **安装依赖**: \`npm install\`
- **构建生产版本**: \`npm run build\` (实际上运行 \`ray build -e dist\`)
- **开发模式**: \`npm run dev\` (实际上运行 \`ray develop\`，用于本地调试)`;

        const result = formatter.format(input);

        console.log("输入：");
        console.log(input);
        console.log("\n输出：");
        console.log(result);

        // 检查标题空格被保留
        expect(result).toContain("### 构建与开发");
        expect(result).not.toContain("###构建与开发");

        // 检查粗体标记没有被破坏
        expect(result).toContain("**安装依赖**");
        expect(result).not.toContain("** 安装依赖 **");

        expect(result).toContain("**构建生产版本**");
        expect(result).not.toContain("** 构建生产版本 **");

        expect(result).toContain("**开发模式**");
        expect(result).not.toContain("** 开发模式 **");
    });
});
