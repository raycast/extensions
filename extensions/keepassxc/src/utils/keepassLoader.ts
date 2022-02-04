import { copyTextToClipboard,pasteText,getPreferenceValues,showToast,ToastStyle} from "@raycast/api";
const {promisify} = require('util')
const fs = require('fs')
const stat = promisify(fs.stat)
const path = require('path')
const exec = promisify(require("child_process").exec);


interface Preference{
    keepassxcRootPath:string;
    database:string;
    dbPassword:string;
}

const preferences:Preference = getPreferenceValues()

const dbPassword = preferences.dbPassword
const cacheFile = path.join("/tmp/",'kpass_db.cache')
const database = preferences.database
const keepassxcCli = path.join(preferences.keepassxcRootPath,"Contents/MacOS/keepassxc-cli")

const loadEntries = async () => {
    if (!fs.existsSync(cacheFile)){
        const {stdout} = await exec(`echo "${dbPassword}" | "${keepassxcCli}" locate "${database}" / -q`)
        fs.writeFileSync(cacheFile, stdout.toString('utf8'))
    }
    const lastModifiedTime = (await stat(cacheFile)).mtime.getTime()
    const currTime = new Date().getTime()
    let data = ''
    if(currTime - lastModifiedTime <= 1000 * 60 && fs.existsSync(cacheFile)) {
        data = fs.readFileSync(cacheFile, 'utf8')
    }else{
        
        const {stdout} = await exec(`echo "${dbPassword}" | "${keepassxcCli}" locate "${database}" / -q`)
        data = stdout.toString('utf8')
        fs.writeFileSync(cacheFile, data)
    }

    return data.split('\n').map((f:string) => f.trim()).filter((f:string) => (f !== undefined)&&(!f.startsWith('/回收站')) && (!f.startsWith('/Trash') && f.length > 0))
}

const getPassword = async (entry:string) => {
    const {stdout} = await exec(`echo "${dbPassword}"  | "${keepassxcCli}"  show -q  -a Password "${database}" "${entry}"`)
    return stdout.toString('utf8').trim()
}

const getUsername = async (entry:string) => {
    const {stdout} = await exec(`echo "${dbPassword}"  | "${keepassxcCli}"  show -q  -a Username "${database}" "${entry}"`)
    return stdout.toString('utf8').trim()

}

const copyAndPastePassword = async (entry:string) => {
    return copyPassword(entry).then(password => {
        return pasteText(password).then(() => password)
    })
}

const copyPassword = async (entry:string) => getPassword(entry)
    .then(
        password => copyTextToClipboard(password).then(()=>password)
        )
        

const copyAndPasteUsername = async (entry:string) => {
    return copyUsername(entry).then(username =>{
        return pasteText(username).then(() => username)
    })
}



const copyUsername = async (entry:string) => getUsername(entry).then(username => copyTextToClipboard(username).then(() => username))

export {loadEntries,copyAndPastePassword,getPassword,copyPassword,copyUsername,copyAndPasteUsername}

