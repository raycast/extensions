import { Detail } from "@raycast/api";
import { LivePollView } from "./lib/LivePollView";
import { readRunState } from "./lib/runState";

/**
 * Resume Current Release
 *
 * 只读：读 state 文件 → 读 live log → 读 result.json / *.summary.txt
 * 不启动任何进程，不写任何文件（除了轮询状态展示）。
 */
export default function Command() {
  const state = readRunState();

  if (!state) {
    return (
      <Detail
        navigationTitle="Resume Current Release"
        markdown={[
          "## 无运行记录",
          "",
          "目前没有任何发布任务记录。",
          "",
          "请先使用「Release to TestFlight」命令启动发布，然后再回来查看进度。",
        ].join("\n")}
      />
    );
  }

  return <LivePollView state={state} />;
}
