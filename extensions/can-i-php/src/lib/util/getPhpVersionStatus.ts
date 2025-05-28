import { PhpVersion } from "../types/phpVersion";
import { PhpVersionStatusEnum } from "../types/phpVersionStatusEnum";

export function getPhpVersionStatus(phpVersion: PhpVersion) {
  const today = new Date();
  if (today < new Date(phpVersion.support)) {
    return PhpVersionStatusEnum.Active;
  } else if (today < new Date(phpVersion.eol)) {
    return PhpVersionStatusEnum.SecurityUpdates;
  } else {
    return PhpVersionStatusEnum.EOL;
  }
}
