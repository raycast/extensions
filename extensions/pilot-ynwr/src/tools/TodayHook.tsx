import { LocalStorage } from '@raycast/api'
import { useEffect, useState } from 'react'

const useToday = () => {

    const [needRefresh, setNeedRefresh] = useState<boolean>(false)

    const checkToday = async () => {
        const today = new Date().toISOString()
        const lastDay = await LocalStorage.getItem('today')
        if(today === lastDay) {
            setNeedRefresh(false)
        } else {
            await LocalStorage.setItem('today', today)
            setNeedRefresh(true)
        }
    }

    useEffect(()=> {
        checkToday();
    })

  return {needRefresh} 
}

export default useToday