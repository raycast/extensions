export function validateNotEmptyString(s: (value: (((prevState: (string | undefined)) => (string | undefined)) | string | undefined)) => void) {
    return (v: string) => {
        if (v === "") {
            s(`Required`)
            return
        }
        s(undefined)
    }
}
