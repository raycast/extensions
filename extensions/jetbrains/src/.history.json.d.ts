// JSON structure for entries in ~/Library/Application Support/JetBrains/Toolbox/apps/**/.history.json
export default interface History {
  action: string;
  item: Item;
  timestamp: Date;
}

interface Item {
  id: string;
  name: string;
  description: string;
  order_value: number;
  released: Date;
  icon_url: string;
  home_url: string;
  version: string;
  major_version: MajorVersion;
  build: string;
  quality: Quality;
  whats_new: WhatsNew;
  supported_languages: SupportedLanguage[];
  licensing: Licensing;
  package: Package;
  post_install: PostInstall;
  uninstall: Uninstall;
  activation?: Activation;
  intellij_platform?: IntellijPlatform;
  description_i18n?: I18N;
  home_url_i18n?: I18N;
  product_overview?: ProductOverview;
}

interface Activation {
  hosts: string[];
}

interface I18N {
  de?: string;
  "es-ES"?: string;
  fr?: string;
  ja: string;
  ko: string;
  "pt-BR"?: string;
  ru: string;
  "zh-CN": string;
}

interface IntellijPlatform {
  product_code: string;
  vmoptions: string;
  vmoptions_content: string;
  user_vmoptions_path: string;
  incompatible_vmoptions: string[];
  shell_script_name: string;
  config: Config[];
  default_config_directories: DefaultConfigDirectories;
  java_path: string;
}

interface Config {
  directory: string;
  recent_projects_filename: string;
}

interface DefaultConfigDirectories {
  "idea.system.path": string;
  "idea.config.path": string;
  "idea.log.path": string;
  "idea.plugins.path": string;
}

interface Licensing {
  license_is_required: boolean;
  sales_code: string;
  is_part_of: string;
  buy_url: string;
  major_release_date: Date;
}

interface MajorVersion {
  name: string;
  order_value: number;
}

interface Package {
  os: string;
  type: string;
  url: string;
  size: number;
  checksums: Checksum[];
  requirements?: Requirements;
}

interface Checksum {
  alg: string;
  value: string;
}

interface Requirements {
  cpu_arch: CPUArch;
}

interface CPUArch {
  $eq: string;
  error_message: string;
}

interface PostInstall {
  steps: Step[];
}

interface Step {
  id: string;
  progress: Progress;
  required: boolean;
  commands: Command[];
  intellij: StepIntellij;
}

interface Command {
  arguments: string[];
  intellij?: CommandIntellij;
}

interface CommandIntellij {
  additional_vmoptions_content: string;
}

interface StepIntellij {
  temporary_copy_directories: TemporaryDirectory[];
  temporary_new_directories: TemporaryDirectory[];
  vmoptions_environment_variable: string;
}

interface TemporaryDirectory {
  name: string;
}

interface Progress {
  visible: boolean;
  message: string;
}

interface ProductOverview {
  html_description: string;
  html_description_i18n: I18N;
  additional_links: AdditionalLink[];
}

interface AdditionalLink {
  type: string;
  name: string;
  name_i18n: I18N;
  link: string;
  link_i18n?: I18N;
}

interface Quality {
  description: string;
  name: string;
  order_value: number;
  description_i18n?: I18N;
}

interface SupportedLanguage {
  id: string;
}

interface Uninstall {
  feedback: Feedback;
}

interface Feedback {
  url: string;
  text: string;
  confirm_text: string;
  cancel_text: string;
}

interface WhatsNew {
  full_html: string;
  link?: Link;
}

interface Link {
  url: string;
  text: string;
}
