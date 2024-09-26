import { QueryDatabaseResponse } from "@notionhq/client/build/src/api-endpoints"
import { Evnt, InternProject, Journal, Keystone, Link, Project, SubProject, Timer, Todo } from "../interfaces/itemsInterfaces"
import { br } from "../tools/markdownTools"


interface EvntResult {
    id:string,
    properties: {
        Name:{
            title: [
                {plain_text:string}
            ]
        },
        Projects: {
            relation:{id:string}[]
        },
        Projects_Name:{
            rollup:{
                array:[{
                    title:[{
                        plain_text:string
                    }]
                }]
            }
        },
        Projects_Icon:{
            rollup:{
                array:[{
                    rich_text:[{
                        plain_text:string
                    }]
                }]
            }
        },
        Projects_Active:{
            rollup:{
                array:[{
                    checkbox:boolean
                }]
            }
        },
        Date:{
            date:{
                start:string,
                end:string
            }
        }
    }
}
export const getEvents = (data:QueryDatabaseResponse) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const result:EvntResult[] = data.results

    const events:Evnt[] = []
    result.map((obj:EvntResult) => {
        const project:InternProject = {
            name:obj.properties.Projects_Name.rollup.array[0].title[0].plain_text,
            icon:obj.properties.Projects_Icon.rollup.array[0].rich_text[0].plain_text,
            id:obj.properties.Projects.relation[0].id,
            active:obj.properties.Projects_Active.rollup.array[0].checkbox
        }
        const event:Evnt = {
            id:obj.id,
            name:obj.properties.Name.title[0].plain_text,
            start:obj.properties.Date.date.start,
            end:obj.properties.Date.date.end,
            project:project
        }
        events.push(event)
    })
    return events
}
// ----------------------------------------------------------------

interface JournalResult {
    id:string,
    properties: {
        Name:{
            title: [
                {plain_text:string}
            ]
        },
        Projects: {
            relation:{id:string}[]
        },
        Projects_Name:{
            rollup:{
                array:[{
                    title:[{
                        plain_text:string
                    }]
                }]
            }
        },
        Projects_Icon:{
            rollup:{
                array:[{
                    rich_text:[{
                        plain_text:string
                    }]
                }]
            }
        },
        Projects_Active:{
            rollup:{
                array:[{
                    checkbox:boolean
                }]
            }
        },
        Text:{
            rich_text:[{text: {content:string}}]
        },
        Date:{
            date:{
                start:string
            }
        },
        Todos: {
            relation:{id:string}[]
        },
        Todos_Name: {
            rollup:{
                array:[{
                    title:[{
                        plain_text:string
                    }]
                }]
            }
        },
        Todos_Checkbox: {
            rollup:{
                array:{checkbox:boolean}[]
            }
        },
        Timers_Date: {
            rollup:{
                array:[{
                    date:{
                        start:string,
                        end:string,
                    }
                }]

            }
        }

    }
}
export const getJournals = (data:QueryDatabaseResponse) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const result:JournalResult[] = data.results
    const journals:Journal[] = []
    result.map((obj:JournalResult) => {


        const project:InternProject = {
            name:obj.properties.Projects_Name.rollup.array[0].title[0].plain_text,
            icon:obj.properties.Projects_Icon.rollup.array[0].rich_text[0].plain_text,
            id:obj.properties.Projects.relation[0].id,
            active:obj.properties.Projects_Active.rollup.array[0].checkbox
        }

        const todos:Todo[] = []
        obj.properties.Todos.relation.map((t,i)=> {
            const todo:Todo = {
                id: obj.properties.Todos.relation[i].id,
                name: obj.properties.Todos_Name.rollup.array[i].title[0].plain_text,
                checkbox: obj.properties.Todos_Checkbox.rollup.array[0].checkbox,
                project: project,
                keystone: {
                    date: "",
                    id: "",
                    name: "",
                    project: {
                        name: "",
                        icon: "",
                        id: "",
                        active: false
                    },
                    todos: []
                }
            }
            
            todos.push(todo)
        })
        let richText:string = ""
        const textMap = obj.properties.Text.rich_text[0].text.content.split(`\n`)
        textMap.map(t=> richText = richText + t + br)

        let times = 0
        obj.properties.Timers_Date.rollup.array.map((t)=> {
            const time = new Date(t.date.end).getTime()-new Date(t.date.start).getTime()
            times = times + time
        })

        const journal:Journal = {
            name: obj.properties.Name.title[0].plain_text,
            id: obj.id,
            text: richText,
            date: obj.properties.Date.date.start,
            project: project,
            todos: todos,
            times:times/60000
        
        }
        journals.push(journal)
    })
    return journals
}
// ----------------------------------------------------------------
interface KeystoneResult {
    id:string,
    properties: {
        Name:{
            title: [
                {plain_text:string}
            ]
        },
        Projects: {
            relation:{id:string}[]
        },
        Projects_Name:{
            rollup:{
                array:[{
                    title:[{
                        plain_text:string
                    }]
                }]
            }
        },
        Projects_Icon:{
            rollup:{
                array:[{
                    rich_text:[{
                        plain_text:string
                    }]
                }]
            }
        },
        Projects_Active:{
            rollup:{
                array:[{
                    checkbox:boolean
                }]
            }
        },
        Todos: {
            relation:{id:string}[]
        },
        Todos_Name:{
            rollup:{
                array:[{
                    title:[{
                        plain_text:string
                    }]
                }]
            }
        },
        Todos_Checkbox:{
            rollup:{
                array:[{
                    checkbox:boolean
                }]
            }
        }
        Date:{
            date:{
                start:string
            }
        }
    } 
}

export const getKeystones = (data:QueryDatabaseResponse) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const result:KeystoneResult[] = data.results

    const keystones:Keystone[] = []

    result.map((obj:KeystoneResult) => {
        const project:InternProject = {
            name:obj.properties.Projects_Name.rollup.array[0].title[0].plain_text,
            icon:obj.properties.Projects_Icon.rollup.array[0].rich_text[0].plain_text,
            id:obj.properties.Projects.relation[0].id,
            active:obj.properties.Projects_Active.rollup.array[0].checkbox
        }
        const todos:Todo[] =[]
        if(obj.properties.Todos.relation.length > 0) {
            obj.properties.Todos.relation.map((t,i) => {
                const todo:Todo = {
                    id:obj.properties.Todos.relation[i].id,
                    name:obj.properties.Todos_Name.rollup.array[i].title[0].plain_text,
                    checkbox:obj.properties.Todos_Checkbox.rollup.array[i].checkbox,
                    project:project,
                    keystone:{
                        id: "",
                        name: "",
                        date: "",
                        project: {
                            name: "",
                            icon: "",
                            id: "",
                            active: false
                        },
                        todos: []
                    }

                }
                todos.push(todo)
            })
        }
        const keystone:Keystone = {
            id:obj.id,
            date:obj.properties.Date.date.start,
            name:obj.properties.Name.title[0].plain_text,
            project:project,
            todos:todos
        }
        keystones.push(keystone)
    })
    return keystones
}

// ----------------------------------------------------------------

interface LinkResult {
    id:string,
    properties: {
        Name:{
            title: [
                {plain_text:string}
            ]
        },
        App:{
            title: [
                {plain_text:string}
            ]
        },
        Icon:{
            title: [
                {plain_text:string}
            ]
        },
        Projects: {
            relation:{id:string}[]
        },

        Projects_Name:{
            rollup:{
                array:[{
                    title:[{
                        plain_text:string
                    }]
                }]
            }
        },
        Projects_Icon:{
            rollup:{
                array:[{
                    rich_text:[{
                        plain_text:string
                    }]
                }]
            }
        },
        Projects_Active:{
            rollup:{
                array:[{
                    checkbox:boolean
                }]
            }
        },
        Link:{
            url:string
        }
    } 
}

export const getLinks = (data:QueryDatabaseResponse) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const result:LinkResult[] = data.results
    const links:Link[] = []


    result.map((obj:LinkResult) => {
        const project:InternProject = {
            name:obj.properties.Projects_Name.rollup.array[0].title[0].plain_text,
            icon:obj.properties.Projects_Icon.rollup.array[0].rich_text[0].plain_text,
            active:obj.properties.Projects_Active.rollup.array[0].checkbox,
            id:obj.properties.Projects.relation[0].id,
        }
        const link:Link = {
            app:obj.properties.App.title[0].plain_text,
            icon:obj.properties.Icon.title[0].plain_text,
            project:project,
            id:obj.id,
            name:obj.properties.Name.title[0].plain_text,
            url:obj.properties.Link.url,
        }
        links.push(link)
    })
    return links
}

//----------------------------------------------------------------

interface ProjectResult {
    properties:{
        Name:{
            title: [
                {plain_text:string}
            ]
        },
        Active:{
            checkbox:boolean
        }
        TodosRatio:{
            formula:{
                string:string
            }
        },     
        Links:{
            relation:[{
                id:string
            }]
        },
        Links_Name:{
            rollup:{
                array:[{
                    title:[{
                        plain_text:string
                    }]
                }]
            }
        },
        Links_URL:{
            rollup:{
                array:[{
                    url:string
                }]
            }
        },
        Links_Icon:{
            rollup:{
                array:[{
                    rich_text:[{
                        plain_text:string
                    }]
                }]
            }
        },
        Links_App:{
            rollup:{
                array:[{
                    rich_text:[{
                        plain_text:string
                    }]
                }]
            }
        },
        Timers_Date:{
            rollup:{
                array:[{
                    date:{
                        start:string,
                        end:string,
                    }
                }]
            }
        }
        Parent:{
            relation:{id:string}[]
        },
        Parent_Name:{
            rollup:{
                array:[{
                    title:[{
                        plain_text:string
                    }]
                }]
            }
        },
        Parent_Icon:{
            rollup:{
                array:[{
                    rich_text:[{
                        plain_text:string
                    }]
                }]
            }
        },
        Parent_Active:{
            rollup:{
                array:[{
                    checkbox:boolean
                }]
            }
        }
    },
    id:string,
    icon: {
        emoji:string
    },
    url:string
}

export const getProjectsList = (data:QueryDatabaseResponse) => {
    if(data) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const results:ProjectResult[] = data.results 


    const subProjectList:SubProject[] = []
    const projectList:Project[] = []
    results.map((r:ProjectResult)=> {
        if(r.properties.Parent.relation.length === 0 ) {
            const links:Link[] = []
            if(r.properties.Links.relation.length > 0) {
                r.properties.Links.relation.map((l,i) => {
                    const link:Link = {
                        id: l.id,
                        name: r.properties.Links_Name.rollup.array[i].title[0].plain_text,
                        url: r.properties.Links_URL.rollup.array[i].url,
                        project: {
                            name: r.properties.Name.title[0].plain_text,
                            icon: r.icon.emoji,
                            id: r.id,
                            active: true
                        },
                        icon: r.properties.Links_Icon.rollup.array[i].rich_text[0].plain_text,
                        app: r.properties.Links_App.rollup.array[i].rich_text[0].plain_text
                    }
                    links.push(link)
                })
            }
            
            let times = 0
            r.properties.Timers_Date.rollup.array.map((t)=> {
                const time = new Date(t.date.end).getTime()-new Date(t.date.start).getTime()
                times = times + time
            })

            const obj:Project = {
                id:r.id,
                name:r.properties.Name.title[0].plain_text,
                active:r.properties.Active.checkbox,
                icon:r.icon.emoji,
                subsProject:[],
                url:r.url,
                links:links,
                todosRatio:r.properties.TodosRatio.formula.string,
                times:times/60000
            }
            projectList.push(obj)
        } else {
            const interProject:InternProject = {
                name:r.properties.Parent_Name.rollup.array[0].title[0].plain_text,
                icon:r.properties.Parent_Icon.rollup.array[0].rich_text[0].plain_text,
                id:r.properties.Parent.relation[0].id,
                active:r.properties.Parent_Active.rollup.array[0].checkbox
            }
            const subProject:SubProject = {
                parentID:r.properties.Parent.relation[0].id,
                name:r.properties.Name.title[0].plain_text,
                url:r.url,
                project:interProject,
                icon:r.icon.emoji
            }
            subProjectList.push(subProject)
        }
    })

    subProjectList.map((subP:SubProject)=> {
        const parentProject = projectList.find((p:Project)=>p.id === subP.parentID)
        parentProject?.subsProject.push(subP)
    })


    return projectList
    } else {
        return []
    }
}

// ----------------------------------------------------------------


interface TimerResult {
    id:string,
    properties: {
        Name:{
            title: [
                {plain_text:string}
            ]
        },
        Projects: {
            relation:{id:string}[]
        },
        Projects_Name:{
            rollup:{
                array:[{
                    title:[{
                        plain_text:string
                    }]
                }]
            }
        },
        Projects_Icon:{
            rollup:{
                array:[{
                    rich_text:[{
                        plain_text:string
                    }]
                }]
            }
        },
        Projects_Active:{
            rollup:{
                array:[{
                    checkbox:boolean
                }]
            }
        },
        Date:{
            date:{
                start:string,
                end:string
            }
        },
        Running:{
            checkbox:boolean
        }
    }
}

export const getTimers = (data:QueryDatabaseResponse) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const result:TimerResult[] = data.results
    const timers:Timer[] = []


    result.map((obj:TimerResult) => {


        const project:InternProject = {name:"", icon:"", id:"", active:false}

        if(obj.properties.Projects.relation.length !== 0) {
        project.name=obj.properties.Projects_Name.rollup.array[0].title[0].plain_text
        project.icon=obj.properties.Projects_Icon.rollup.array[0].rich_text[0].plain_text
        project.id=obj.properties.Projects.relation[0].id
        project.active=obj.properties.Projects_Active.rollup.array[0].checkbox
        }

        
        const timer:Timer = {
            id:obj.id,
            project:project,
            start:obj.properties.Date.date.start,
            end:obj.properties.Date.date.end,
            running:obj.properties.Running.checkbox
        }
        timers.push(timer)
    })
    return timers
}

// ----------------------------------------------------------------


interface TodoResult {
    id:string,
    properties: {
        Name:{
            title: [
                {plain_text:string}
            ]
        },
        Projects: {
            relation:{id:string}[]
        },
        Projects_Name:{
            rollup:{
                array:[{
                    title:[{
                        plain_text:string
                    }]
                }]
            }
        },
        Projects_Icon:{
            rollup:{
                array:[{
                    rich_text:[{
                        plain_text:string
                    }]
                }]
            }
        },
        Projects_Active:{
            rollup:{
                array:[{
                    checkbox:boolean
                }]
            }
        },
        Keystones: {
            relation:{id:string}[]
        },
        Keystones_Name:{
                rollup:{
                    array:[{
                        title:[{
                            plain_text:string
                        }]
                    }]
                }
        },
        Keystones_Date:{
            rollup:{
                array:[{
                    date:{
                        start:string
                    }
                }]
            }
        },
        Checkbox:{
            checkbox:boolean
        }
    } 
}


export const getTodos = (data:QueryDatabaseResponse) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const result:TodoResult[] = data.results

    const todos:Todo[] =[]

    result.map((obj) => {
        const project:InternProject = {
            name:obj.properties.Projects_Name.rollup.array[0].title[0].plain_text,
            icon:obj.properties.Projects_Icon.rollup.array[0].rich_text[0].plain_text,
            id:obj.properties.Projects.relation[0].id,
            active:obj.properties.Projects_Active.rollup.array[0].checkbox
        }


        let keystone:Keystone = {
            name: "", date: "",
            id: "",
            project: {
                name: "",
                icon: "",
                id: "",
                active: false
            },
            todos: []
        }
        if(obj.properties.Keystones_Name.rollup.array.length > 0) {
            keystone = {
            id:obj.properties.Keystones.relation[0].id,
            name:obj.properties.Keystones_Name.rollup.array[0].title[0].plain_text,
            date:obj.properties.Keystones_Date.rollup.array[0].date.start,
            project:{
                name: "",
                icon: "",
                id: "",
                active: false
            },
            todos:[]
        }
        }


        const todo:Todo = {
            id:obj.id,
            name:obj.properties.Name.title[0].plain_text,
            checkbox:obj.properties.Checkbox.checkbox,
            project:project,
            keystone:keystone
        }
        todos.push(todo)
    })
    return todos
}