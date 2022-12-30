import { readdir } from "fs/promises"
import { packzManualLanguage } from "../assets/preferences";

export default async function getLatestPackzInstalled(applicationsUrl: string): Promise<string> {
  try {
    const applicationFolderContent = await readdir(applicationsUrl, { encoding: "utf8" })
    const latestPackzFolder = applicationFolderContent.filter( (application) => application.toLowerCase().includes('packz')).at(-1)
    const latestPackzFolderContent = await readdir(`${applicationsUrl}/${latestPackzFolder}`, { encoding: "utf8" })
    const packzApplicationFile = latestPackzFolderContent.filter( (file) => file.toLowerCase().includes('packz'))
    const packzManualUrl = `file:///Applications/${latestPackzFolder}/${packzApplicationFile[0]}/Contents/Resources/Manual/${packzManualLanguage}/index_frames.html`
    return packzManualUrl
  } catch (err) {
    return "";
  }
}
