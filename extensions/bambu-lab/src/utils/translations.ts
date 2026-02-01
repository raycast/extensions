import { getPreferenceValues } from "@raycast/api";

interface Translations {
  printer_status: string;
  printing: string;
  printer_ready: string;
  subtitle_progress: string;
  section_tools: string;

  light_on_action: string;
  light_off_action: string;
  light_on_status: string;
  light_off_status: string;
  action_toggle: string;

  preheat_title: string;
  submenu_material: string;
  action_preheat_pla: string;
  action_preheat_petg: string;
  action_cooldown: string;

  section_steering: string;

  pause_inactive: string;
  resume_print: string;
  pause_print: string;
  resume_action: string;
  action_inactive: string;

  stop_inactive: string;
  stop_emergency: string;
  stop_action: string;

  alert_stop_short_title: string;
  alert_stop_btn: string;

  tooltip_nozzle: string;
  tooltip_bed: string;
  tooltip_time: string;
  tooltip_layer: string;

  tag_pause: string;
  tag_run: string;
  tag_idle: string;

  action_view_ams: string;

  toast_command_sent: string;
  toast_preheat_started: string;

  ams_title: string;
  ams_header_slot: string;
  ams_header_material: string;
  ams_header_color: string;
  ams_header_remain: string;
  ams_status_empty: string;
  ams_view_title: string;

  form_submit_upload: string;
  form_file_label: string;
  form_file_info: string;
  error_no_file: string;
  error_wrong_ext: string;

  search_placeholder_sd: string;

  upload_selected_prefix: string;
  action_send_printer: string;
  action_choose_other: string;
  action_choose_file: string;

  sd_load_title: string;
  action_load: string;

  alert_file_label: string;
  alert_print_btn: string;

  status_connected: string;
  status_disconnected: string;
  section_upload: string;
  upload_manual_title: string;
  upload_manual_subtitle: string;
  section_sd: string;
  action_print: string;
  confirm_print_title: string;
  confirm_print_msg: string;
  action_refresh: string;

  progress_analyzing_sd: string;
  toast_sd_loaded: string;
  toast_files_count: string;
  toast_no_files: string;
  toast_no_printable_files: string;
  toast_ftp_error: string;
  progress_upload: string;
  progress_upload_percent: string;
  toast_upload_complete: string;
  toast_upload_error: string;
  toast_error: string;
  toast_printer_disconnected: string;
  toast_print_started: string;

  action_print_without_ams: string;
  action_print_with_ams: string;
  alert_mode_standard: string;
  alert_print_without_ams_msg: string;
  alert_mode_ams: string;
  alert_print_with_ams_msg: string;
  ams_status_on: string;
  ams_status_off: string;
}

const en: Translations = {
  printer_status: "Printer Status",
  printing: "Printing",
  printer_ready: "Printer Ready",
  subtitle_progress: "Progress: ",
  section_tools: "Tools",
  light_on_action: "Turn Light On",
  light_off_action: "Turn Light Off",
  light_on_status: "ON",
  light_off_status: "OFF",
  action_toggle: "Toggle",
  preheat_title: "Preheat",
  submenu_material: "Material",
  action_preheat_pla: "PLA (60°C / 220°C)",
  action_preheat_petg: "PETG (80°C / 250°C)",
  action_cooldown: "Cooldown (0°C)",
  section_steering: "Steering",
  pause_inactive: "Pause (Inactive)",
  resume_print: "Resume Printing",
  pause_print: "Pause Printing",
  resume_action: "Resume",
  action_inactive: "Inactive",
  stop_inactive: "Emergency Stop (Inactive)",
  stop_emergency: "EMERGENCY STOP",
  stop_action: "Stop Printing",
  alert_stop_short_title: "Stop?",
  alert_stop_btn: "Stop",
  tooltip_nozzle: "Nozzle",
  tooltip_bed: "Bed",
  tooltip_time: "Time remaining",
  tooltip_layer: "Current layer",
  tag_pause: "PAUSE",
  tag_run: "RUN",
  tag_idle: "IDLE",
  action_view_ams: "View AMS Content",
  toast_command_sent: "Command sent",
  toast_preheat_started: "Preheating started",
  ams_title: "AMS Content",
  ams_header_slot: "Slot",
  ams_header_material: "Material",
  ams_header_color: "Color",
  ams_header_remain: "Remaining",
  ams_status_empty: "Empty",
  ams_view_title: "AMS Details",
  form_submit_upload: "Send to Printer",
  form_file_label: "File",
  form_file_info: ".3mf or .gcode",
  error_no_file: "Please select a file.",
  error_wrong_ext: "Only .3mf and .gcode files are accepted!",
  search_placeholder_sd: "Search file on SD...",
  upload_selected_prefix: "Upload:",
  action_send_printer: "Send to Printer",
  action_choose_other: "Choose another file...",
  action_choose_file: "Choose file",
  sd_load_title: "Load files",
  action_load: "Load",
  alert_file_label: "File:",
  alert_print_btn: "Print",
  status_connected: "Connected",
  status_disconnected: "Disconnected",
  section_upload: "Upload",
  upload_manual_title: "Manual Upload",
  upload_manual_subtitle: "Upload a file directly to the printer",
  section_sd: "SD Card",
  action_print: "Print",
  confirm_print_title: "Start Print?",
  confirm_print_msg: "Are you sure you want to start printing this file?",
  action_refresh: "Refresh",
  progress_analyzing_sd: "Analyzing SD card...",
  toast_sd_loaded: "SD loaded",
  toast_files_count: "files",
  toast_no_files: "No files",
  toast_no_printable_files: "No printable files found",
  toast_ftp_error: "FTP Error",
  progress_upload: "Upload:",
  progress_upload_percent: "Upload",
  toast_upload_complete: "Upload complete!",
  toast_upload_error: "Upload Error",
  toast_error: "Error",
  toast_printer_disconnected: "Printer disconnected",
  toast_print_started: "Print started 🚀",
  action_print_without_ams: "Print WITHOUT AMS",
  action_print_with_ams: "Print WITH AMS",
  alert_mode_standard: "Standard Mode",
  alert_print_without_ams_msg: "Print without using AMS?",
  alert_mode_ams: "AMS Mode",
  alert_print_with_ams_msg: "Force AMS usage?",
  ams_status_on: "ON",
  ams_status_off: "OFF",
};

const fr: Translations = {
  printer_status: "État de l'imprimante",
  printing: "Impression",
  printer_ready: "L'imprimante Prête",
  subtitle_progress: "Progression : ",
  section_tools: "Outils",
  light_on_action: "Allumer la lumière",
  light_off_action: "Éteindre la lumière",
  light_on_status: "ON",
  light_off_status: "OFF",
  action_toggle: "Basculer",
  preheat_title: "Préchauffer",
  submenu_material: "Matériau",
  action_preheat_pla: "PLA (60°C / 220°C)",
  action_preheat_petg: "PETG (80°C / 250°C)",
  action_cooldown: "Refroidir (0°C)",
  section_steering: "Pilotage",
  pause_inactive: "Mettre en Pause (Inactif)",
  resume_print: "Reprendre l'impression",
  pause_print: "Mettre en Pause",
  resume_action: "Reprendre",
  action_inactive: "Inactif",
  stop_inactive: "Arrêt d'urgence (Inactif)",
  stop_emergency: "ARRÊT D'URGENCE",
  stop_action: "Arrêter l'impression",
  alert_stop_short_title: "Arrêter ?",
  alert_stop_btn: "Stop",
  tooltip_nozzle: "Buse",
  tooltip_bed: "Plateau",
  tooltip_time: "Temps restant",
  tooltip_layer: "Couche actuelle",
  tag_pause: "PAUSE",
  tag_run: "ACTIF",
  tag_idle: "PRÊTE",
  action_view_ams: "Voir contenu AMS",
  toast_command_sent: "Commande envoyée",
  toast_preheat_started: "Préchauffage lancé",
  ams_title: "Contenu AMS",
  ams_header_slot: "Slot",
  ams_header_material: "Matériau",
  ams_header_color: "Couleur",
  ams_header_remain: "Reste",
  ams_status_empty: "Vide",
  ams_view_title: "Détails AMS",
  form_submit_upload: "Envoyer sur l'imprimante",
  form_file_label: "Fichier",
  form_file_info: ".3mf ou .gcode",
  error_no_file: "Veuillez sélectionner un fichier.",
  error_wrong_ext: "Seuls les fichiers .3mf et .gcode sont acceptés !",
  search_placeholder_sd: "Rechercher un fichier sur la SD...",
  upload_selected_prefix: "Uploader :",
  action_send_printer: "Envoyer vers l'imprimante",
  action_choose_other: "Choisir un autre fichier...",
  action_choose_file: "Choisir un fichier",
  sd_load_title: "Charger les fichiers",
  action_load: "Charger",
  alert_file_label: "Fichier :",
  alert_print_btn: "Imprimer",
  status_connected: "Connecté",
  status_disconnected: "Déconnecté",
  section_upload: "Télécharger",
  upload_manual_title: "Téléchargement manuel",
  upload_manual_subtitle: "Téléchargez un fichier directement vers l'imprimante",
  section_sd: "Carte SD",
  action_print: "Imprimer",
  confirm_print_title: "Démarrer l'impression ?",
  confirm_print_msg: "Êtes-vous sûr de vouloir lancer l'impression de ce fichier ?",
  action_refresh: "Rafraîchir",
  progress_analyzing_sd: "Analyse de la carte SD...",
  toast_sd_loaded: "SD chargée",
  toast_files_count: "fichiers",
  toast_no_files: "Aucun fichier",
  toast_no_printable_files: "Rien d'imprimable trouvé",
  toast_ftp_error: "Erreur FTP",
  progress_upload: "Upload :",
  progress_upload_percent: "Upload",
  toast_upload_complete: "Upload terminé !",
  toast_upload_error: "Erreur Upload",
  toast_error: "Erreur",
  toast_printer_disconnected: "Imprimante déconnectée",
  toast_print_started: "Impression lancée 🚀",
  action_print_without_ams: "Imprimer SANS AMS",
  action_print_with_ams: "Imprimer AVEC AMS",
  alert_mode_standard: "Mode Standard",
  alert_print_without_ams_msg: "Imprimer sans utiliser l'AMS ?",
  alert_mode_ams: "Mode AMS",
  alert_print_with_ams_msg: "Forcer l'utilisation de l'AMS ?",
  ams_status_on: "ON",
  ams_status_off: "OFF",
};

export const getTranslations = (): Translations => {
  const prefs = getPreferenceValues<{ language?: string }>();

  if (prefs.language === "fr") return fr;
  if (prefs.language === "en") return en;

  const systemLang = Intl.DateTimeFormat().resolvedOptions().locale;
  if (systemLang.startsWith("fr")) return fr;

  return en;
};
