const formatDate = (date: string) => {
    // turn 2023-01-23T09:25:36+0000 into Day, Date Month Year, 09:25:36
    const dateObj = new Date(date)
    const day = dateObj.toLocaleDateString('en-US', { weekday: 'long' })
    const dateNum = dateObj.toLocaleDateString('en-US', { day: 'numeric' })
    const month = dateObj.toLocaleDateString('en-US', { month: 'long' })
    const year = dateObj.toLocaleDateString('en-US', { year: 'numeric' })
    const time = dateObj.toLocaleTimeString('en-US', { hour12: false })

    return `${day}, ${dateNum} ${month} ${year}, ${time}`
}

const formatStatus = (status: string | string[]) => {
    if (typeof status === 'string') {
        status = status.split(' ')
    }

    status = status.map((s) => s.replace(/\(.*\)/gmi, '').trim())
    status = status.map((s) => s.replace(/https?:\/\/[^\s]+/gmi, '').trim())
    status = [...new Set(status)]
    status = status.filter((s) => s)
    return status
}

const formatNameservers = (nameservers: string | string[]) => {
    if (typeof nameservers === 'string') {
        nameservers = nameservers.split(' ')
    }
    return nameservers
}

export function formatData(data: any) {
    const whoisData = {
        registrar: data?.registrar ? data.registrar : 'Unknown',
        registrarEmail: data?.registrarAbuseContactEmail ? data.registrarAbuseContactEmail : 'Unknown',
        registrant: data?.registrant ? data.registrant : data?.registrantOrganization ? data.registrantOrganization : 'Unknown',
        created: data?.creationDate ? formatDate(data.creationDate) : 'Unknown',
        updated: data?.updatedDate ? formatDate(data.updatedDate) : 'Unknown',
        expires: data?.registrarRegistrationExpirationDate ? formatDate(data.registrarRegistrationExpirationDate) : 'Unknown',
        status: data?.domainStatus ? formatStatus(data.domainStatus) : 'Unknown',
        nameservers: data?.nameServer ? formatNameservers(data.nameServer) : 'Unknown',
    }
    return Object.entries(whoisData).map(([key, value]) => {
        return {
            key,
            value,
        }
    })
}

export function formatTitle(title: string) {
    // turn field => Field
    // fieldName => Field Name
    title = title.replace(/([A-Z])/g, ' $1')
    title = title.charAt(0).toUpperCase() + title.slice(1)

    return title
}