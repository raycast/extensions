import { describe, it, expect } from "vitest";
import { MarkdownASTFormatter } from "../src/services/markdown-ast-formatter";

describe("MarkdownASTFormatter", () => {
    const formatter = new MarkdownASTFormatter();

    describe("标题格式化", () => {
        it("应该保留标题后的空格", () => {
            const input = "### 构建与开发";
            const result = formatter.format(input);

            // 标题后应该保留空格
            expect(result).toContain("### 构建与开发");
            expect(result).not.toContain("###构建与开发");
        });

        it("应该在标题的中英文之间添加空格", () => {
            const input = "### LeanCloud简介";
            const result = formatter.format(input);

            expect(result).toContain("LeanCloud 简介");
        });
    });

    describe("粗体格式化", () => {
        it("应该保持粗体标记不被破坏", () => {
            const input = "- **安装依赖**: `npm install`";
            const result = formatter.format(input);

            // 粗体标记应该保持完整，内部不应该有额外空格
            expect(result).toContain("**安装依赖**");
            expect(result).not.toContain("** 安装依赖 **");
        });

        it("应该在粗体内的中英文之间添加空格", () => {
            const input = "**LeanCloud简介**";
            const result = formatter.format(input);

            expect(result).toContain("**LeanCloud 简介**");
        });
    });

    describe("列表格式化", () => {
        it("应该保持列表标记不被破坏", () => {
            const input = "- **安装依赖**: `npm install`\n- **构建生产版本**: `npm run build`";
            const result = formatter.format(input);

            expect(result).toContain("**安装依赖**");
            expect(result).toContain("**构建生产版本**");
        });

        it("应该在列表项的中英文之间添加空格", () => {
            const input = "- 安装依赖\n- 运行npm命令";
            const result = formatter.format(input);

            expect(result).toContain("运行 npm 命令");
        });
    });

    describe("完整 Markdown 文档", () => {
        it("应该正确格式化复杂的 Markdown 文档", () => {
            const input = `### 构建与开发
- **安装依赖**: \`npm install\`
- **构建生产版本**: \`npm run build\` (实际上运行 \`ray build -e dist\`)
- **开发模式**: \`npm run dev\` (实际上运行 \`ray develop\`，用于本地调试)`;

            const result = formatter.format(input);

            // 检查标题
            expect(result).toContain("### 构建与开发");

            // 检查粗体
            expect(result).toContain("**安装依赖**");
            expect(result).toContain("**构建生产版本**");
            expect(result).toContain("**开发模式**");

            // 确保粗体标记没有被破坏
            expect(result).not.toContain("** 安装依赖 **");
            expect(result).not.toContain("** 构建生产版本 **");
        });
    });

    describe("代码块保护", () => {
        it("应该不格式化行内代码", () => {
            const input = "运行 `npm install` 命令";
            const result = formatter.format(input);

            // 代码内容应该保持不变
            expect(result).toContain("`npm install`");
            // 周围的空格应该被保留
            expect(result).toContain("运行 `npm install` 命令");
        });

        it("应该不格式化代码块", () => {
            const input = `\`\`\`bash
npm run   dev
\`\`\``;
            const result = formatter.format(input);

            // 代码块内的内容应该保持不变
            expect(result).toContain("npm run   dev");
        });
    });

    describe("中英文混排", () => {
        it("应该在中英文之间添加空格", () => {
            const input = "在LeanCloud上，数据存储是围绕AVObject进行的。";
            const result = formatter.format(input);

            expect(result).toContain("LeanCloud 上");
            expect(result).toContain("AVObject 进行");
        });

        it("应该在中文和数字之间添加空格", () => {
            const input = "我家的光纤入户宽带有10Gbps";
            const result = formatter.format(input);

            // 数字和单位之间也会加空格（这是正确的排版）
            expect(result).toContain("有 10 Gbps");
        });
    });
});

describe("MarkdownASTFormatter.isMarkdown", () => {
    it("应该识别标题", () => {
        expect(MarkdownASTFormatter.isMarkdown("# 标题")).toBe(true);
        expect(MarkdownASTFormatter.isMarkdown("### 三级标题")).toBe(true);
    });

    it("应该识别粗体", () => {
        expect(MarkdownASTFormatter.isMarkdown("**粗体文本**")).toBe(true);
    });

    it("应该识别列表", () => {
        expect(MarkdownASTFormatter.isMarkdown("- 列表项")).toBe(true);
        expect(MarkdownASTFormatter.isMarkdown("1. 有序列表")).toBe(true);
    });

    it("应该识别代码", () => {
        expect(MarkdownASTFormatter.isMarkdown("`代码`")).toBe(true);
        expect(MarkdownASTFormatter.isMarkdown("```代码块```")).toBe(true);
    });

    it("普通文本应该返回 false", () => {
        expect(MarkdownASTFormatter.isMarkdown("这是普通文本")).toBe(false);
        expect(MarkdownASTFormatter.isMarkdown("在LeanCloud上")).toBe(false);
    });
});
