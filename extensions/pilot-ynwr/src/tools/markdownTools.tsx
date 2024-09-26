

export const h1 = (text:string) => {return '## ' + text }
export const h2 = (text:string) => {return '##### ' + text }

export const code = (text:string) => {
    const mk = '```'+
    text +
    '```'
    return mk
}




export const br = `

`

export const sepa = "---"

export const b = (text:string) => {return '**'+text+'**' }