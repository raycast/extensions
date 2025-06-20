export interface Translation {
  common: {
    save: string;
    delete: string;
    cancel: string;
    create: string;
    edit: string;
    name: string;
    path: string;
    command: string;
    app: string;
  };
  preset: {
    add: string;
    edit: string;
    delete: string;
    details: string;
    nameExists: string;
    chooseName: string;
    saved: string;
    deleted: string;
    saveFailed: string;
    loadFailed: string;
    confirmDelete: string;
    deleteMessage: string;
    deleteFailed: string;
    updated: string;
    updateFailed: string;
    noPresets: string;
    addFirst: string;
    searchPlaceholder: string;
    noCommand: string;
    manage: string; // 用于命令标题
  };
  project: {
    create: string;
    name: string;
    created: string;
    failed: string;
    noPreset: string;
    needName: string;
    creating: string;
    selectPreset: string;
  };
  form: {
    presetName: string;
    baseFolder: string;
    ideApp: string;
    initCommand: string;
    fillAll: string;
    nameRequired: string; // 新增
    folderRequired: string; // 新增
    appRequired: string; // 新增
  };
}
