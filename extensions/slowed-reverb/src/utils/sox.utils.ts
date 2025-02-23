import { getPreferenceValues } from '@raycast/api'
import { execSync } from 'child_process'

export function getPreference(key: keyof Preferences): string {
  return getPreferenceValues<Preferences>()[key]
}

const getSoxPath = () => {
  const defaultSoxPath = getPreference('customSoxPath')
  const commandFolderPath = execSync(`
  locations=(
      ${defaultSoxPath}
      /opt/homebrew/bin/sox
      /usr/local/bin/sox
      /usr/bin/sox
      /bin/sox
      /usr/sbin/sox
      /sbin/sox
      /opt/X11/bin/sox
      /usr/local/Cellar/sox
  )
  
  for location in "\${locations[@]}"
  do
      if [ -f "$location" ]
      then
          echo "$location"
          exit 0
      fi
  done
  
  echo ""
`)
    .toString()
    .trim()

  if (commandFolderPath) return commandFolderPath.replace(/\n/gi, '')
  return ''
}

const isSoxInstalled = () => !!getSoxPath()

const executeSoxCommand = (command: string) => execSync(`${getSoxPath()} ${command}`).toString()

export const soxUtils = {
  getSoxPath,
  isSoxInstalled,
  executeSoxCommand
}
