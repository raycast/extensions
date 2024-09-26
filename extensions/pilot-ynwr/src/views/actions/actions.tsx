import { Action, Icon } from "@raycast/api"

export const ClearRefreshAction = ({clearRefresh, setFirst, setShow}:{clearRefresh:()=>void, setFirst:(v:boolean)=>void,setShow:(v:boolean)=>void}) => {
    const action = () => {
        setFirst(true)
        setShow(false)
        clearRefresh()
    }
    return <Action title="Clear Cache & Refresh" shortcut={{modifiers:['cmd','shift'], key:"r"}} style={Action.Style.Destructive}  icon={Icon.ClearFormatting} onAction={()=> {action()}} />
}

export const RefreshAction = ({refresh}:{refresh:(v:string[])=>void}) => {
    return <Action title='Refresh' icon={Icon.Repeat} shortcut={{modifiers:['cmd'], key:"r"}} onAction={()=>{refresh(['all'])}} />
}

export const DeleteAction = ({handle, id}:{handle:(id:string)=>void, id:string}) => {
    return <Action title='Delete' style={Action.Style.Destructive} shortcut={{modifiers:['cmd'], key:"x"}} onAction={()=>handle(id)} icon={Icon.Trash}  />
}