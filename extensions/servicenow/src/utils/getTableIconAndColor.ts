const tableIconColorMap = {
  incident: { icon: "ExclamationMark", color: "Red" },
  group: { icon: "TwoPeople", color: "Blue" },
  user: { icon: "Person", color: "Blue" },
  cmdb: { icon: "HardDrive", color: "Orange" },
  project: { icon: "Clipboard", color: "Purple" },
  change: { icon: "Cog", color: "Yellow" },
  problem: { icon: "Bug", color: "Magenta" },
  knowledge: { icon: "Book", color: "Yellow" },
  kb_view: { icon: "Book", color: "Yellow" },
  cat_item: { icon: "Cart", color: "Green" },
  req_item: { icon: "Box", color: "Green" },
  request: { icon: "Envelope", color: "Green" },
  report: { icon: "BarChart", color: "Purple" },
  task: { icon: "CheckList", color: "Yellow" },
  // Script/UI/event tables — more specific keys must come before generic prefixes
  // ("sys_script", "sys_ui_", "sysevent_") because getTableIconAndColor matches
  // via substring includes().
  sys_script_include: { icon: "Code", color: "Blue" },
  sys_script_client: { icon: "Code", color: "Green" },
  sys_script_fix: { icon: "WrenchScrewdriver", color: "Orange" },
  sys_script_validator: { icon: "CheckCircle", color: "Green" },
  sys_script_ajax: { icon: "Globe", color: "Blue" },
  sys_ui_script: { icon: "Code", color: "Purple" },
  sys_ui_action: { icon: "Mouse", color: "Purple" },
  sys_ui_policy: { icon: "Shield", color: "Purple" },
  sys_ui_page: { icon: "Window", color: "Magenta" },
  sys_ui_macro: { icon: "AppWindowList", color: "Magenta" },
  sys_ui_style: { icon: "Brush", color: "Purple" },
  sys_script: { icon: "Code", color: "Yellow" },
  sysevent_in_email_action: { icon: "Envelope", color: "Green" },
  sysevent_email_action: { icon: "Envelope", color: "Blue" },
  sysevent_email_template: { icon: "Envelope", color: "Purple" },
  sysevent_script_action: { icon: "Code", color: "Magenta" },
  sysauto_script: { icon: "Clock", color: "Blue" },
  sys_trigger: { icon: "Clock", color: "Orange" },
  sys_transform_script: { icon: "Switch", color: "Magenta" },
  sys_transform_map: { icon: "Switch", color: "Yellow" },
  sys_processor: { icon: "Cog", color: "Orange" },
  sys_security_acl: { icon: "Shield", color: "Red" },
  sys_relationship: { icon: "Link", color: "Blue" },
  sys_widgets: { icon: "Window", color: "Green" },
  sys_installation_exit: { icon: "ArrowClockwise", color: "Magenta" },
  ecc_agent_script_include: { icon: "HardDrive", color: "Blue" },
  wf_activity_definition: { icon: "BarChart", color: "Purple" },
  kb_navons: { icon: "Book", color: "Purple" },
  bsm_action: { icon: "Map", color: "Orange" },
  cmn_map_page: { icon: "Map", color: "Purple" },
  process_step_approval: { icon: "CheckCircle", color: "Yellow" },
  content_block_programmatic: { icon: "Document", color: "Magenta" },
  documate_page: { icon: "Document", color: "SecondaryText" },
};

export function getTableIconAndColor(tableName: string) {
  for (const key in tableIconColorMap) {
    if (tableName.includes(key)) {
      return tableIconColorMap[key as keyof typeof tableIconColorMap];
    }
  }
  return { icon: "Info", color: "SecondaryText" };
}
