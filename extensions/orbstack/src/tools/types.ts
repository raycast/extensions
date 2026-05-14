import { Architecture, ARCHITECTURES, Distro, DISTROS } from "../orbstack";

export interface BaseArgs {
  /**
   * REQUIRED
   * The name of the OrbStack machine.
   * If the user did not explictly specify a machine name then ask them for the machine name.
   *
   * @example alpine
   */
  machine_name: string;
}

export function validateBaseArgs(args: BaseArgs) {
  if (!args.machine_name) {
    throw new Error("machine_name is required. Ask the user for the machine name.");
  }
}

//
// We can't extend BaseArgs because the property doc strings
// don't seem to be visible to the LLM when you extend.
export interface CommandArgs {
  /**
   * REQUIRED
   * The name of the OrbStack machine.
   * If the user did not explictly specify a machine name then ask them for the machine name.
   *
   * @example alpine
   */
  machine_name: string;

  /**
   * REQUIRED
   * The shell command to run in the OrbStack machine.
   * System commands usually require sudo.
   *
   * @example ["ls", "-l"]

   * Assuming alpine based machine:
   * @example ["sudo", "apk", "add", "fish"]
   */
  command: string[];
}

export function validateCommandArgs(args: CommandArgs) {
  validateBaseArgs(args);

  if (!args.command || args.command.length === 0) {
    throw new Error("command is required. Ask the user for the machine name.");
  }
}

export interface CreateArgs {
  /**
   * REQUIRED
   * The name of the OrbStack machine.
   * If the user DID NOT EXPLICTLY SPECIFY a machine name THEN ASK them for the machine name.
   * Machine names cannot have underscores; instead use dashes.
   */
  machine_name: string;
  /**
   * REQUIRED
   * The name of the Linux distro.
   * If the user did not explictly specify a distro then ask them for the distro name.
   * These are the ONLY distros supported:
   *
   * alma
   * alpine
   * arch
   * centos
   * debian
   * devuan
   * fedora
   * gentoo
   * kali
   * nixos
   * openeuler
   * opensuse
   * oracle
   * rocky
   * ubuntu
   * void
   *
   */
  distro: string;

  /**
   * OPTIONAL
   * The version of the distro. DO NOT set this unless the user EXPLICITLY specified.
   */
  version?: string;

  /**
   * OPTIONAL
   * The username of the distro. DO NOT set this unless the user EXPLICITLY specified.
   * A default value will be used if this is not set.
   */
  user_name?: string;

  /**
   * OPTIONAL
   * The version of the distro. DO NOT set this unless the user EXPLICITLY specified.
   * A default value of arm64 will be used.
   *
   * The ONLY valid values are arm64 or x86_64
   */
  architecture?: string;
}

export function validateCreateArgs(args: CreateArgs) {
  validateBaseArgs(args);

  if (!args.machine_name || args.machine_name.includes("_")) {
    throw new Error(
      "machine_name is required. Ask the user for the machine name. Machine names cannot have underscores; use dashes instead.",
    );
  }

  if (!DISTROS.map((e) => e.value).includes(args.distro as Distro)) {
    throw new Error(`distro must be one of the following: ${DISTROS.join(", ")}`);
  }

  // architecture is optional but if set, make sure it's supported.
  if (
    args.architecture !== undefined &&
    !ARCHITECTURES.map((e) => e.value).includes(args.architecture as Architecture)
  ) {
    throw new Error("architecture must be either arm64 or x86_64");
  }

  // user_name is optional but if set, make sure it isn't blank.
  if (args.user_name !== undefined && args.user_name.trim() === "") {
    throw new Error("user_name cannot be empty. Ask the user for the username.");
  }

  // version is optional but if set, make sure it isn't blank.
  if (args.version !== undefined && args.version.trim() === "") {
    throw new Error("user_name cannot be empty. Ask the user for the username.");
  }
}

export interface CloneArgs {
  /**
   * REQUIRED
   * The name of the existing OrbStack machine to clone from.
   */
  old_name: string;
  /**
   * REQUIRED
   * The target name for the cloned machine. Must not contain underscores and must differ from old_name.
   */
  new_name: string;
}

export function validateCloneArgs(args: CloneArgs) {
  if (!args.old_name || !args.new_name) {
    throw new Error("old_name and new_name are required");
  }
  if (args.new_name.includes("_")) {
    throw new Error("new_name must not contain underscores");
  }
  if (args.old_name === args.new_name) {
    throw new Error("new_name must be different from old_name");
  }
}
