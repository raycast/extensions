import { Action, ActionPanel, Toast, showToast, useNavigation } from "@raycast/api";
import { CompileConfig, add_LocalConfig_watch, exec_watch, remove_LocalConfig_watch } from "./util_compile";
import { Dispatch } from "react";
import { delayOperation } from "./util_other";

// Action for the watch compile form
export function WatchCompileAction(props: {
  config: CompileConfig;
  set_config: Dispatch<React.SetStateAction<CompileConfig>>;
  pop_callBack?: () => void;
  prefill_config?: CompileConfig;
  delete_prefill?: boolean;
}) {
  const { pop } = useNavigation();
  return (
    <ActionPanel>
      <Action.SubmitForm
        title="Save Configuration"
        shortcut={{ modifiers: ["cmd"], key: "s" }}
        onSubmit={(values) => {
          const cur_config: CompileConfig = {
            scssPath: values.scssPath[0] == null ? "" : values.scssPath[0],
            cssPath: values.cssPath[0] == null ? "" : values.cssPath[0],
            outputStyle: values.outputStyle,
            sourceMap: values.sourceMap,
            watchCompile: values.watchCompile == "true",
          };
          if (props.delete_prefill == true && props.prefill_config != undefined) {
            remove_LocalConfig_watch(props.prefill_config).then(() => {
              add_LocalConfig_watch(cur_config).then((msg) => {
                if (msg == "updated duplicate") {
                  showToast({ title: "⚙️\tConfiguration Saved (updated existing config)", style: Toast.Style.Success });
                } else {
                  showToast({ title: "⚙️\tConfiguration Saved", style: Toast.Style.Success });
                }
                if (cur_config.watchCompile) {
                  delayOperation(500).then(() => {
                    showToast({ title: "Watching ...", style: Toast.Style.Animated });
                    exec_watch(cur_config)
                      .then(() => {
                        showToast({ title: "Success !", style: Toast.Style.Success });
                      })
                      .catch(() => {
                        showToast({ title: "Failed !", style: Toast.Style.Failure });
                      });
                  });
                }
                if (props.pop_callBack != undefined) {
                  props.pop_callBack();
                }
                pop();
              });
            });
          } else {
            add_LocalConfig_watch(cur_config).then((msg) => {
              if (msg == "updated duplicate") {
                showToast({ title: "⚙️\tConfiguration Saved (updated existing config)", style: Toast.Style.Success });
              } else {
                showToast({ title: "⚙️\tConfiguration Saved", style: Toast.Style.Success });
              }
              if (cur_config.watchCompile) {
                exec_watch(cur_config);
              }
              if (props.pop_callBack != undefined) {
                props.pop_callBack();
              }
              pop();
            });
          }
        }}
      />
    </ActionPanel>
  );
}
