import {URLSearchParams} from "url";
import crypto from "crypto";
import os from "os";
import fetch from "node-fetch"
import {ApiError, AuthyApp, Device, Registration, RegistrationStatus, Services} from "./dto";

const baseUrl = "https://api.authy.com/json";
// extracted from chrome plugin
const API_KEY = "37b312a3d682b823c439522e1fd31c82";
const SIGNATURE = crypto.randomBytes(32).toString("hex");

export async function requestRegistration(authyId: number): Promise<Registration> {
    const formData = new URLSearchParams();
    formData.set("api_key", API_KEY);
    formData.set("via", "push");
    formData.set("device_app", "Raycast Authy Extension");
    formData.set("device_name", `Raycast Authy Extension on ${os.hostname()}`);
    formData.set("signature", SIGNATURE);
    const resp = await fetch(`${baseUrl}/users/${authyId}/devices/registration/start`, {
        method: "POST",
        body: formData
    });

    if (resp.ok) {
        const registration = await resp.json() as Registration
        console.log(registration);
        return registration;
    } else {
        throw new Error((await resp.json() as ApiError).message)
    }
}

export async function checkRequestStatus(authyId: number, requestId: string): Promise<RegistrationStatus> {
    const formData = new URLSearchParams();
    formData.set("api_key", API_KEY);
    formData.set("signature", SIGNATURE);
    formData.set("locale", "en-GB")
    console.log(`${baseUrl}/users/${authyId}/devices/registration/${requestId}/status?` + formData)
    // return Promise.reject();
    const resp = await fetch(`${baseUrl}/users/${authyId}/devices/registration/${requestId}/status?` + formData, {
        method: "GET"
    });
    if (resp.ok) {
        const registrationStatus = await resp.json() as RegistrationStatus
        console.log(registrationStatus);
        return registrationStatus;
    } else {
        const apiError = await resp.json() as ApiError;
        console.log(apiError)
        throw new Error((await resp.json() as ApiError).message)
    }
}

export async function completeRegistration(authyId: number, pin: string): Promise<Device> {
    const formData = new URLSearchParams();
    formData.set("pin", pin);
    formData.set("api_key", API_KEY);
    formData.set("signature", SIGNATURE);
    formData.set("device_app", "Raycast Authy Extension");
    formData.set("device_name", `Raycast Authy Extension on ${os.hostname()}`);
    const resp = await fetch(`${baseUrl}/users/${authyId}/devices/registration/complete`, {
        method: "POST",
        body: formData
    });
    if (resp.ok) {
        const device = await resp.json() as Device
        console.log(device);
        return device;
    } else {
        throw new Error((await resp.json() as ApiError).message)
    }
}

export async function getAuthyApps(authyId: number, deviceId: number, otps: number[]): Promise<AuthyApp> {
    const formData = new URLSearchParams();
    formData.set("api_key", API_KEY);
    formData.set("signature", SIGNATURE);
    formData.set("device_id", `${deviceId}`);
    formData.set("locale", "en-GB");
    formData.set("otp1", `${otps[0]}`);
    formData.set("otp2", `${otps[1]}`);
    formData.set("otp3", `${otps[2]}`);
    const resp = await fetch(`${baseUrl}/users/${authyId}/devices/${deviceId}/apps/sync/`, {
        method: "POST",
        body: formData
    });
    if (resp.ok) {
        const authyApp = await resp.json() as AuthyApp
        console.log(authyApp);
        return authyApp;
    } else {
        throw new Error((await resp.json() as ApiError).message)
    }
}

export async function getServices(authyId: number, deviceId: number, otps: number[]): Promise<Services>{
    const formData = new URLSearchParams();
    formData.set("api_key", API_KEY);
    formData.set("signature", SIGNATURE);
    formData.set("device_id", `${deviceId}`);
    formData.set("apps", ""); // get all existing apps
    formData.set("otp1", `${otps[0]}`);
    formData.set("otp2", `${otps[1]}`);
    formData.set("otp3", `${otps[2]}`);
    console.log(`${baseUrl}/users/${authyId}/authenticator_tokens?` + formData)
    const resp = await fetch(`${baseUrl}/users/${authyId}/authenticator_tokens?` + formData);
    if (resp.ok) {
        const services = await resp.json() as Services
        console.log(services);
        return services;
    } else {
        throw new Error((await resp.json() as ApiError).message)
    }
}