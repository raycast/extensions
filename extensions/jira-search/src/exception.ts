export class Warning extends Error {
    constructor(message: string) {
        super(message)
        this.name = "Warning"
    }
}