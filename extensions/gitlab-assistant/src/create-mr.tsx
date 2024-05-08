import { Form, ActionPanel, Action, showToast, Toast, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { getFirstCommit, getProjects, getBranches, createMr } from "./utils/api";

type Values = {
  projectId: string;
  sourceBranch: string;
  targetBranch: Date;
  title: boolean;
};

export default function Command() {
  const [projects, setProjects] = useState<any[]>([]);
  const [projectId, setProjectId] = useState<string>();
  const [branch, setBranch] = useState<any[]>();
  const [title, setTitle] = useState<string>();

  const handleSubmit = async (values: Values) => {
    createMr({
      id: projectId,
      data: {
        source_branch: values.sourceBranch,
        target_branch: values.targetBranch,
        title: values.title,
      },
    }).then(() => {
      showToast({ title: "Gitlab Merge Request:", message: "创建成功", style: Toast.Style.Success });
    });
  };

  useEffect(() => {
    LocalStorage.getItem("user_config").then((data: any) => {
      const { userID } = JSON.parse(data);
      getProjects(userID).then((data: any) => {
        const projectList = data.map((item: any) => ({
          value: String(item.id),
          title: item.name,
        }));

        setProjects(projectList);
      });
    });
  }, []);

  useEffect(() => {
    if (projectId) {
      getBranches(projectId).then((data) => {
        const sourceList = data.map((item: any) => ({
          value: item.name,
          title: item.name,
        }));
        setBranch(sourceList);
      });
    }
  }, [projectId]);

  const handleSelectProject = (value: string) => {
    setProjectId(value);
  };

  const handleSelectSource = (value: string) => {
    getFirstCommit({ id: projectId as string, branch: value }).then((data: any) => {
      setTitle(data?.[0]?.message);
    });
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="创建" />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="projectId" title="项目" onChange={handleSelectProject}>
        {projects?.map((item) => <Form.Dropdown.Item key={item.value} title={item.title} value={item.value} />)}
      </Form.Dropdown>
      <Form.Dropdown id="sourceBranch" title="源分支" placeholder="选择源分支" onChange={handleSelectSource}>
        {branch?.map((item) => <Form.Dropdown.Item key={item.value} title={item.title} value={item.value} />)}
      </Form.Dropdown>
      <Form.Dropdown id="targetBranch" title="目标分支" placeholder="选择目标分支">
        {branch?.map((item) => <Form.Dropdown.Item key={item.value} title={item.title} value={item.value} />)}
      </Form.Dropdown>
      <Form.TextField
        id="title"
        title="标题"
        placeholder="请输入标题"
        value={title}
        onBlur={(event) => {
          if (event.target.value?.length !== 0) {
            setTitle(event.target.value);
          }
        }}
      ></Form.TextField>
    </Form>
  );
}
