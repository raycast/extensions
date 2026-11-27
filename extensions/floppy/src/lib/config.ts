export const BASE_URL = "https://fpy.sh";

/** Where Floppy for Mac mounts Floppy Disk (Finder shows it as "Floppy Disk"). */
export const DISK_MOUNT = `${process.env.HOME}/Library/Application Support/Floppy/Disk/Floppy Disk`;

/** The one-call drop takes files up to 100 MB; bigger files and several files go multipart. */
export const DROP_MAX_BYTES = 100_000_000;
