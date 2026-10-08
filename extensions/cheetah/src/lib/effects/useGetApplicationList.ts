// 获取系统已安装的应用列表
import { Application, getApplications } from "@raycast/api";
import { useState } from "react";

export default (): [Application[], boolean, () => Promise<void>] => {
  const [resultList, setResultList] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  async function getApplicationList() {
    setLoading(true);
    const applications: Application[] = await getApplications();
    setResultList(applications);
    setLoading(false);
  }

  return [resultList, loading, getApplicationList];
};
