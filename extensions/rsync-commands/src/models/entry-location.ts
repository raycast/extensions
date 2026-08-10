export default class EntryLocation {
  public userName: string
  public hostName: string
  public port: string
  public path: string
  public identityFile: string

  constructor(rawData?: EntryLocationRaw) {
    if (rawData) {
      this.userName = rawData.userName
      this.hostName = rawData.hostName
      this.port = rawData.port
      this.path = rawData.path
      this.identityFile = rawData.identityFile ?? ""
    } else {
      this.userName = ""
      this.hostName = ""
      this.port = "22"
      this.path = ""
      this.identityFile = ""
    }
  }

  getErrors(identifier: string, includeSsh: boolean) {
    const errors: string[] = []

    const userName = this.userName.trim()
    const hostName = this.hostName.trim()
    const path = this.path.trim()
    const port = this.port

    if (!path) errors.push(`Path missing for ${identifier}.`)
    if (includeSsh) {
      if (port !== "22" && isNaN(Number(port))) errors.push(`Port for ${identifier} is not a number.`)
      if (userName && !hostName) errors.push(`Hostname is missing for ${identifier}.`)
      if (!userName && hostName) errors.push(`Username is missing for ${identifier}.`)
    }

    return errors
  }

  getCommandPart(identifier: string, includeSsh: boolean): string {
    const userName = this.userName.trim()
    const hostName = this.hostName.trim()
    const path = this.path.trim()

    return userName && includeSsh ? `${userName}@${hostName}:${path}` : path
  }

  toRawData() {
    return {
      userName: this.userName,
      hostName: this.hostName,
      port: this.port,
      path: this.path,
      identityFile: this.identityFile,
    } as EntryLocationRaw
  }
}

export type EntryLocationRaw = {
  userName: string
  hostName: string
  port: string
  path: string
  identityFile: string
}
