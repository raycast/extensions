import axios, { AxiosResponse } from 'axios';
import * as cheerio from 'cheerio'

export const getLinks = async () => {
    const result = await axios.get("https://en.cppreference.com/w/cpp")
    const html = result.data
    const $ = cheerio.load(html)
    let links = $("a").map((i, link) => ({
        text: $(link).text(),
        url: $(link).attr("href")
    })).get().filter(link => link.url?.startsWith("/w/cpp/"))
    .map(link => ({
        text: link.text.trim().replaceAll(/_/g, ' ')
        .replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())))
        .replace(/V(\d)/g, 'Version $1'),
        url: link.url
    })).sort((a, b) => a.text.localeCompare(b.text))
    // remove links with the same text
    const set = new Set<string>()
    links = links.filter(link => {
        const text = link.text
        if (set.has(text)) {
            return false
        }
        set.add(text)
        return true
    })
    return links
}

export const getSections = async (url: string) => {
    const result = await axios.get("https://en.cppreference.com" + url)
        .catch(err => {throw(err)})
    const html = result.data
    const $ = cheerio.load(html)

    const elements = $('#mw-content-text').children()
    let sections = []
    let lastSection:any = {
        title: "",
        markdown: "",
    }

    for (const element of elements) {
        const tag = element.tagName
        if (tag.match(/^h[1-6]$/)) {
            sections.push(lastSection)
            lastSection = {}
            lastSection.title = formatHeader($(element).text())
            lastSection.markdown = "# " + lastSection.title + "\n"
        }
        else if (tag === "p") {
            lastSection.markdown += formatDescription($(element).text()) + "\n\n"
        }
        else if (element.attributes[0]?.value === "t-dsc-begin") {
            for (const body of  $(element).children()) {
                const rows = $(body).find('tr')
                let temp = ""
                for (const row of rows) {
                    $(row).find('h5').each(() => {
                        lastSection.markdown += "\n## " + formatTitle($(row).text()) + "\n"
                    })
                    $(row).find('td').each((i, cell) => {
                        if (i === 0) {
                            const lines = $(cell).find('.t-lines').children().filter((i, line) => {
                                const text = $(line).text().trim()
                                return text.length > 0 && !text.includes("C++")
                            })
                            if (lines.length === 0) {
                                lastSection.markdown += "* " + $(cell).text().trim() + ": "
                            }
                            else if (lines.length === 1) {
                                lastSection.markdown += "* `" + $(lines[0]).text() + "`: " 
                            }
                            else if (lines.length > 1) {
                                lines.each((i, line) => {
                                    temp += "* `" + $(line).text().trim() + "`\n"
                                })
                            }
                            const link = $(cell).find('a').attr('href')
                            // console.log("link: " + link)
                        }
                        else if (i === 1) {
                            lastSection.markdown += formatDescription($(cell).text()) + "\n"
                            if (temp !== "") {
                                lastSection.markdown += temp
                                temp = ""
                            }
                            lastSection.markdown += "\n"
                        }
                    })
                }
            }
        }
        else if (element.attributes[0]?.value === "dsctable") { 
            for (const body of  $(element).children()) {
                const rows = $(body).find('tr')
                let temp = ""
                for (const row of rows) {
                    $(row).find('h5').each(() => {
                        lastSection.markdown += "\n## " + formatTitle($(row).text()) + "\n"
                    })
                    $(row).find('td').each((i, cell) => {
                        if (i === 0) {
                            const lines = $(cell).find('.t-lc').children().filter((i, line) => {
                                const text = $(line).text().trim()
                                return text.length > 0 && !text.includes("C++")
                            })
                            if (lines.length === 0) {
                                lastSection.markdown += "* " + $(cell).text().trim() + ": "
                            }
                            else if (lines.length === 1) {
                                lastSection.markdown += "* `" + $(lines[0]).text() + "`: " 
                            }
                            else if (lines.length > 1) {
                                lines.each((i, line) => {
                                    temp += "* `" + $(line).text().trim() + "`:-\n"
                                })
                            }
                            const link = $(cell).find('a').attr('href')
                        }
                        else if (i === 1) {
                            const description = formatDescription($(cell).text())
                            if (temp !== "") {
                                temp = temp.replaceAll(":-", ": " + description)
                                lastSection.markdown += temp;
                                temp = ""
                            }
                            else lastSection.markdown += description + "\n"
                            lastSection.markdown += "\n"
                        }
                    })
                }
            }
        }
        else if (element.attributes[0]?.value === "t-example") {
            $(element).find('pre').each((i, pre) => {
                if (i === 0) {
                    lastSection.markdown += "Code: \n"
                    lastSection.markdown += "\n```cpp\n" + $(pre).text() + "\n```\n"
                }
                else {
                    lastSection.markdown += "Output: \n"
                    lastSection.markdown += "```\n" + $(pre).text() + "\n```\n"
                }
            })
        }
    }
    if (sections[0].markdown.split("\n").length > 5) {
        const title = formatTitle($("#firstHeading").text())
        sections[0].title = "Description"
        sections[0].markdown = `# ${title}\n\n` + sections[0].markdown
    } 
    else sections.shift()

    sections = sections.filter(section => section.markdown.split('\n').filter((line) => line.trim().length > 0).length > 1)

    return sections
}

const formatTitle = (title: string) => {
    return title.replaceAll(/_/g, ' ').replace(/std::/g, '')
        .replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())))
        .replace(/V(\d)/g, 'Version $1')
        .trim()
}

const formatHeader = (header: string) => {
    return header.replace("[edit]", "")
        .replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())))
        .replaceAll(/[(].*[)]/g, "")
        .trim()
}

const formatDescription = (description: string) => {
    description = description.replaceAll("𝓞", "O")
        .replace("[edit]", "")
        .replace("(public member function)", "")
        .replace("(function template)", "")
        .replace("(niebloid)", "")
        .replace("(class template)", "")
        .replace("(function)", "")
        .replace("(class)", "")
        .replace("(macro constant)", "")
        .trim()
        .replace(/^\w/, (c) => c.toUpperCase())

    if (description[description.length - 1].match(/[^.!?:]/)) {
        description += "."
    }
    return description
}