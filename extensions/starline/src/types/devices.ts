export type Item = {
    object: "item";
    default?: boolean;

    // API response
    device_id: number;
    alias: string;
    imei: string;
    sn: string;
    phone: string;
    battery: string;
    ctemp: number;
    etemp: number;
    fw_version: string;
    gsm_lvl: string;
    mon_type: string;
    status: string;
    ts_activity: string;
    type: string;
    typename?: string;
    mayak_temp: string;
    position?: {
        x: string;
        y: string;
        ts: string;
        r: string;
    };
    reg_date: string;
    balance?: {
        active: {
            value: string;
            currency: string;
            operator: string;
            ts: string;
            state: string;
        };
    };
    car_alr_state: {
        door: boolean;
        hbrake: boolean;
        hood: boolean;
        ign: boolean;
        pbrake: boolean;
        shock_h: boolean;
        shock_l: boolean;
        tilt: boolean;
        trunk: boolean;
    };
    car_state: {
        alarm: boolean;
        out: boolean;
        arm: boolean;
        door: boolean;
        hbrake: boolean;
        hijack: boolean;
        hood: boolean;
        ign: boolean;
        r_start: boolean;
        run: boolean;
        trunk: boolean;
        valet: boolean;
        webasto: boolean;
        tilt_bpass: boolean;
        shock_bpass: boolean;
        add_sens_bpass: boolean;
        dvr: boolean;
    };
    functions?: string[];
    controls?: Array<{ position: number; type: string }>;
};

export type Devices = {
    devices: Item[];
    shared_devices?: Item[];
    code?: number;
    codestring?: string;
};

export type CarStatus = {
    add_sens_bpass: string;
    alarm: string;
    arm: string;
    code: number;
    codestring: string;
    door: string;
    hbrake: string;
    hijack: string;
    hood: string;
    ign: string;
    out: string;
    pbrake: string;
    poke: string;
    r_start: string;
    reply_code: string | null;
    run: string;
    shock_bpass: string;
    tilt_bpass: string;
    trunk: string;
    type: string;
    valet: string;
    webasto: string;
};
