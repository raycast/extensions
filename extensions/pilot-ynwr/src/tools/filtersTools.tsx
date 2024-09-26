import { Evnt, Journal, Keystone, Todo } from "../interfaces/itemsInterfaces";


export const projectFilter = (filter:string,items:Todo[]|Keystone[]|Journal[]) => {
    if(filter === "Nothing") return items
    const filteredItems = items.filter(item => item.project.name === filter)
    return [...filteredItems]
}

export const dateOrder = (items:Keystone[]|Journal[]) => {
    return items.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

export const ratioTodos = (todos:Todo[])=> {
    const done = todos.filter(todo => todo.checkbox === true).length
    return {ratio:done/todos.length, done:done}
}

export const nameSearchFilter = (items:Todo[]|Keystone[]|Evnt[], search:string) => {
    const filteredItem:{name:string}[] = []
    const splitSearch = search.split('')
    items.forEach(item => {
        let bool = true;
        splitSearch.forEach(char => {
            if(!item.name.toLowerCase().includes(char)) bool = false;
        })
        if(bool) filteredItem.push(item)
    })
    return filteredItem as Todo[]|Keystone[]|Evnt[]
}

