export default class EntryLocation {
  public userName: string
  public hostName: string
  public port: string
  public path: string

  constructor(rawData?: EntryLocationRaw) {
    if (rawData) {
      this.userName = rawData.userName
      this.hostName = rawData.hostName
      this.port = rawData.port
      this.path = rawData.path
    } else {
      this.userName = ""
      this.hostName = ""
      this.port = "22"
      this.path = ""
    }
  }

  validate(identifier: string, includeSsh: boolean) {
    const userName = this.userName.trim()
    const hostName = this.hostName.trim()
    const path = this.path.trim()

    if (!path) throw `Path is missing for ${identifier}`
    if (includeSsh && userName && !hostName) throw `Hostname is missing for ${identifier}`
    if (includeSsh && !userName && hostName) throw `Username is missing for ${identifier}`
  }

  getCommandPart(identifier: string, includeSsh: boolean): string {
    this.validate(identifier, includeSsh)

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
    } as EntryLocationRaw
  }
}

export type EntryLocationRaw = {
  userName: string
  hostName: string
  port: string
  path: string
}
