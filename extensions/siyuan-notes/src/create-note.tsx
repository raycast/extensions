import { useState, useEffect } from "react";
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  popToRoot,
  Icon,
  LaunchProps,
} from "@raycast/api";
import { siyuanAPI } from "./api/siyuan";
import { SiYuanNotebook, SiYuanTemplate } from "./types";

interface FormValues {
  title: string;
  content: string;
  notebook: string;
  template?: string;
  path?: string;
}

interface Arguments {
  title?: string;
  content?: string;
}

export default function CreateNote(
  props: LaunchProps<{ arguments: Arguments }>,
) {
  const { title: initialTitle, content: initialContent } = props.arguments;

  const [notebooks, setNotebooks] = useState<SiYuanNotebook[]>([]);
  const [templates, setTemplates] = useState<SiYuanTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // 优先加载笔记本，模板可选
      const notebooksData = await siyuanAPI.getNotebooks();
      setNotebooks(notebooksData.filter((nb) => !nb.closed));

      // 尝试加载模板，但不影响主要功能
      try {
        const templatesData = await siyuanAPI.getTemplates();
        setTemplates(templatesData);
      } catch (templateError) {
        console.log("模板加载失败，但不影响创建笔记功能:", templateError);
        setTemplates([]);
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "加载笔记本失败",
        message: error instanceof Error ? error.message : "未知错误",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: FormValues) => {
    if (!values.title.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "请输入笔记标题",
      });
      return;
    }

    if (!values.notebook) {
      showToast({
        style: Toast.Style.Failure,
        title: "请选择笔记本",
      });
      return;
    }

    try {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "正在创建笔记...",
      });

      let docId: string;

      const notePath = values.path || `/${values.title}`;

      if (values.template) {
        docId = await siyuanAPI.createNoteWithTemplate({
          notebook: values.notebook,
          path: notePath,
          title: values.title,
          content: values.content,
          templateId: values.template,
        });
      } else {
        docId = await siyuanAPI.createNote({
          notebook: values.notebook,
          path: notePath,
          title: values.title,
          content: values.content,
        });
      }

      toast.style = Toast.Style.Success;
      toast.title = "笔记创建成功";
      toast.message = `ID: ${docId}`;

      // 创建成功后不自动打开，用户可以通过搜索功能查看
      // 避免使用window.open，因为在Raycast环境中不可用

      popToRoot();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "创建笔记失败",
        message: error instanceof Error ? error.message : "未知错误",
      });
    }
  };

  if (loading) {
    return (
      <Form
        isLoading={true}
        actions={
          <ActionPanel>
            <Action title="加载中…" />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Plus}
            title="创建笔记"
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="标题"
        placeholder="输入笔记标题"
        defaultValue={initialTitle || ""}
      />

      <Form.Dropdown
        id="notebook"
        title="笔记本"
        placeholder="选择笔记本"
        defaultValue={notebooks[0]?.id}
        storeValue
      >
        {notebooks.map((notebook) => (
          <Form.Dropdown.Item
            key={notebook.id}
            value={notebook.id}
            title={notebook.name}
            icon={notebook.icon || Icon.Folder}
          />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="path"
        title="路径"
        placeholder="可选：自定义文档路径 (如: /folder/filename)"
        info="留空将使用标题作为文件名"
      />

      {templates.length > 0 && (
        <Form.Dropdown
          id="template"
          title="模板"
          placeholder="选择模板（可选）"
        >
          <Form.Dropdown.Item value="" title="无模板" />
          {templates.map((template) => (
            <Form.Dropdown.Item
              key={template.id}
              value={template.id}
              title={template.name}
            />
          ))}
        </Form.Dropdown>
      )}

      <Form.TextArea
        id="content"
        title="内容"
        placeholder="输入笔记内容（Markdown格式）"
        defaultValue={initialContent || ""}
        enableMarkdown
      />
    </Form>
  );
}
