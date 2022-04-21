import {useEffect, useState} from "react";
import Config from "../Config";
import useAppExists from "./useAppExists";

export default function useConfig() {
    const [state, setState] = useState({configLoading: true, config: null as Config | null});
    const {appExists, appExistsLoading} = useAppExists();

    useEffect(() => {
        if (appExistsLoading) return;

        if (!appExists) {
            return setState(prev => ({...prev, configIsLoading: false}));
        }

        setState({configLoading: false, config: new Config()})
    }, [appExistsLoading]);

    return {...state, appExists: appExists};
}