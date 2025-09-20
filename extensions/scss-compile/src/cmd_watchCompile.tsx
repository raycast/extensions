import { useEffect, useState } from "react";
import { Action, ActionPanel, Color, Icon, List, Toast, confirmAlert, showToast, useNavigation } from "@raycast/api";
import {
  CompileConfig,
  CompileResult,
  exec_compile,
  exec_pause,
  exec_watch,
  getAll_LocalConfig_watch,
  removeAll_LocalConfigs_watch,
  remove_LocalConfig_watch,
  set_LocalConfig_prev,
  update_LocalConfig_watch,
} from "./util_compile";
import {
  alertConfig_compile,
  alertConfig_delete,
  checkFile_exist,
  delayOperation,
  truncatePath_disp as truncatePath,
} from "./util_other";
import { CompilForm } from "./cmp_CompileForm";
import { WatchCompileAction } from "./cmp_WatchCompileAction";
import { open, showInFinder } from "@raycast/api";

export default function Command() {
  const { push } = useNavigation();
  const [configs, set_configs] = useState<CompileConfig[]>([]);
  const [needReload, set_needReload] = useState<boolean>(true);
  useEffect(() => {
    getAll_LocalConfig_watch().then((config) => {
      set_configs(config);
    });
    set_needReload(false);
  }, [needReload]);

  checkFile_exist("/Users/suowei_hu/Desktop/untitled folder/style.css");

  return (
    <List
      navigationTitle="Convert SCSS to CSS"
      searchBarPlaceholder="Search by filename or directory"
      isLoading={needReload}
    >
      {configs == undefined || configs.length == 0 ? (
        <List.EmptyView
          icon={Icon.CodeBlock}
          title={`Add New Configuration via "⌘ + N"`}
          actions={
            <ActionPanel>
              <Action.Push
                title="New Compile Configuration"
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={
                  <CompilForm
                    FormAction={WatchCompileAction}
                    show_watchOption={true}
                    restore_prevConfig={false}
                    pop_callBack={() => {
                      set_needReload(true);
                    }}
                  />
                }
              />
            </ActionPanel>
          }
        />
      ) : (
        configs.map((config: CompileConfig, config_index) => (
          <List.Item
            key={`config_${config_index}`}
            keywords={[...config.scssPath.split("/"), ...config.cssPath.split("/")]}
            title={{ value: "[SCSS] " + truncatePath(config.scssPath), tooltip: config.scssPath }}
            subtitle={{ value: "[CSS] " + truncatePath(config.cssPath), tooltip: config.cssPath }}
            icon={config.watchCompile ? { source: Icon.CheckCircle, tintColor: Color.Green } : { source: Icon.Circle }}
            accessories={[
              config.outputStyle == "compressed" ? { tag: "Minified" } : {},
              //   { tag: (config_index + 1).toString() },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Compile"
                    icon={Icon.CheckCircle}
                    onAction={() => {
                      if (checkFile_exist(config.scssPath)) {
                        showToast({ title: `Compiling...`, style: Toast.Style.Animated });
                        exec_compile(config)
                          .then(() => {
                            delayOperation(500).then(() => {
                              set_LocalConfig_prev(config);
                              showToast({ title: `Success !`, style: Toast.Style.Success });
                            });
                          })
                          .catch(() => {
                            showToast({
                              title: `Failed !`,
                              style: Toast.Style.Failure,
                              primaryAction: {
                                title: `View Error`,
                                shortcut: { modifiers: ["cmd"], key: "1" },
                                onAction: () => {
                                  open(config.cssPath);
                                },
                              },
                              secondaryAction: {
                                title: `Edit SCSS File`,
                                shortcut: { modifiers: ["cmd"], key: "2" },
                                onAction: () => {
                                  open(config.scssPath);
                                },
                              },
                            });
                          });
                      } else {
                        alertConfig_delete(config).then(() => {
                          set_needReload(true);
                        });
                      }
                    }}
                  />
                  {!config.watchCompile ? (
                    <Action
                      title="Watch"
                      icon={Icon.CheckCircle}
                      onAction={() => {
                        if (checkFile_exist(config.scssPath)) {
                          showToast({ title: `Watching...`, style: Toast.Style.Animated });
                          exec_watch(config).then(() => {
                            delayOperation(500)
                              .then(() => {
                                update_LocalConfig_watch(config, { ...config, watchCompile: true }).then(() => {
                                  set_needReload(true);
                                });
                                delayOperation(500).then(() => {
                                  showToast({ title: `Watched !`, style: Toast.Style.Success });
                                });
                              })
                              .catch(() => {
                                showToast({ title: `Failed !`, style: Toast.Style.Failure });
                              });
                          });
                        } else {
                          alertConfig_delete(config).then(() => {
                            set_needReload(true);
                          });
                        }
                      }}
                    />
                  ) : (
                    <Action
                      title="Stop Watch"
                      icon={Icon.CheckCircle}
                      onAction={() => {
                        showToast({ title: `Stopping...`, style: Toast.Style.Animated });
                        exec_pause(config)
                          .then((data: CompileResult) => {
                            update_LocalConfig_watch(config, { ...config, watchCompile: false }).then(() => {
                              set_needReload(true);
                            });
                            delayOperation(500).then(() => {
                              showToast({ title: `Stopped ! (${data.message})`, style: Toast.Style.Success });
                            });
                          })
                          .catch(() => {
                            showToast({ title: `Failed !`, style: Toast.Style.Failure });
                          });
                      }}
                    />
                  )}
                  <Action
                    title="Compile All"
                    icon={Icon.CheckCircle}
                    shortcut={{ modifiers: ["shift"], key: "enter" }}
                    onAction={() => {
                      showToast({ title: `Compiling All...`, style: Toast.Style.Animated });
                      getAll_LocalConfig_watch().then((config_s) => {
                        Promise.all(
                          config_s.map((config) => {
                            exec_compile(config);
                          }),
                        )
                          .then(() => {
                            return delayOperation(1000);
                          })
                          .then(() => {
                            showToast({ title: `All Compiled !`, style: Toast.Style.Success });
                          })
                          .catch(() => {
                            showToast({ title: `Compile Failed !`, style: Toast.Style.Failure });
                          });
                      });
                    }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Add/Edit/Duplicate Config">
                  <Action.Push
                    title="Add Configuration"
                    icon={Icon.PlusCircle}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    target={
                      <CompilForm
                        FormAction={WatchCompileAction}
                        show_watchOption={true}
                        restore_prevConfig={false}
                        pop_callBack={() => {
                          set_needReload(true);
                        }}
                      />
                    }
                  />
                  <Action
                    title="Edit Configuration"
                    icon={Icon.PlusCircle}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    onAction={() => {
                      if (config.watchCompile) {
                        confirmAlert({
                          title: "Watching SCSS File",
                          message: "Do you wish to pause the watch?",
                          icon: Icon.Warning,
                        }).then((terminate) => {
                          if (terminate) {
                            showToast({ title: "Pausing...", style: Toast.Style.Animated });
                            exec_pause(config).then(() => {
                              delayOperation(500).then(() => {
                                showToast({ title: "Paused !", style: Toast.Style.Success });
                                update_LocalConfig_watch(config, { ...config, watchCompile: false }).then(() => {
                                  push(
                                    <CompilForm
                                      FormAction={WatchCompileAction}
                                      show_watchOption={true}
                                      restore_prevConfig={false}
                                      pop_callBack={() => {
                                        set_needReload(true);
                                      }}
                                      prefill_config={{ ...config, watchCompile: false }}
                                      delete_prefill={true}
                                    />,
                                  );
                                  set_needReload(true);
                                });
                              });
                            });
                          }
                        });
                      } else {
                        push(
                          <CompilForm
                            FormAction={WatchCompileAction}
                            show_watchOption={true}
                            restore_prevConfig={false}
                            pop_callBack={() => {
                              set_needReload(true);
                            }}
                            prefill_config={config}
                            delete_prefill={true}
                          />,
                        );
                      }
                    }}
                  />
                  <Action
                    title="Duplicate Configuration"
                    icon={Icon.PlusCircle}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={() => {
                      push(
                        <CompilForm
                          FormAction={WatchCompileAction}
                          show_watchOption={true}
                          restore_prevConfig={false}
                          pop_callBack={() => {
                            set_needReload(true);
                          }}
                          prefill_config={config}
                          delete_prefill={false}
                        />,
                      );
                    }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Remove Config">
                  <Action
                    title="Remove Configuration"
                    icon={Icon.MinusCircle}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => {
                      if (config.watchCompile) {
                        showToast({ title: "Pausing...", style: Toast.Style.Animated });
                      }
                      exec_pause(config).then(() => {
                        remove_LocalConfig_watch(config).then(() => {
                          delayOperation(500).then(() => {
                            showToast({ title: "Removed !", style: Toast.Style.Success });
                            set_needReload(true);
                          });
                        });
                      });
                    }}
                  />
                  <Action
                    title="Remove All Configuration"
                    icon={Icon.MinusCircle}
                    shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                    onAction={() => {
                      getAll_LocalConfig_watch().then((config_s) => {
                        showToast({ title: "Pausing All...", style: Toast.Style.Animated });
                        Promise.all(
                          config_s.map((config) => {
                            return exec_pause(config);
                          }),
                        ).then(() => {
                          removeAll_LocalConfigs_watch().then(() => {
                            delayOperation(2000).then(() => {
                              showToast({ title: "Removed All!", style: Toast.Style.Success });
                              set_needReload(true);
                            });
                          });
                        });
                      });
                    }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Open/Reveal Files">
                  <ActionPanel.Submenu
                    title="Open File..."
                    icon={Icon.Code}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  >
                    <Action
                      title="SCSS"
                      shortcut={{ modifiers: ["cmd"], key: "1" }}
                      onAction={() => {
                        if (checkFile_exist(config.scssPath)) {
                          open(config.scssPath);
                        } else {
                          alertConfig_delete(config).then(() => {
                            set_needReload(true);
                          });
                        }
                      }}
                    />
                    <Action
                      title="CSS"
                      shortcut={{ modifiers: ["cmd"], key: "2" }}
                      onAction={() => {
                        if (checkFile_exist(config.cssPath)) {
                          open(config.cssPath);
                        } else if (!checkFile_exist(config.cssPath) && checkFile_exist(config.scssPath)) {
                          alertConfig_compile(config).then(() => {
                            open(config.cssPath);
                          });
                        } else {
                          alertConfig_delete(config).then(() => {
                            set_needReload(true);
                          });
                        }
                      }}
                    />
                  </ActionPanel.Submenu>
                  <ActionPanel.Submenu
                    title="Reveal in Finder..."
                    icon={Icon.Finder}
                    shortcut={{ modifiers: ["cmd", "ctrl"], key: "r" }}
                  >
                    <Action
                      title="SCSS"
                      shortcut={{ modifiers: ["cmd"], key: "1" }}
                      onAction={() => {
                        if (checkFile_exist(config.scssPath)) {
                          showInFinder(config.scssPath);
                        } else {
                          alertConfig_delete(config).then(() => {
                            set_needReload(true);
                          });
                        }
                      }}
                    />
                    <Action
                      title="CSS"
                      shortcut={{ modifiers: ["cmd"], key: "2" }}
                      onAction={() => {
                        if (checkFile_exist(config.cssPath)) {
                          showInFinder(config.cssPath);
                        } else if (!checkFile_exist(config.cssPath) && checkFile_exist(config.scssPath)) {
                          alertConfig_compile(config).then(() => {
                            showInFinder(config.cssPath);
                          });
                        } else {
                          alertConfig_delete(config).then(() => {
                            set_needReload(true);
                          });
                        }
                      }}
                    />
                  </ActionPanel.Submenu>
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
