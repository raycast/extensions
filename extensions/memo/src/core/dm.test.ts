import { Page, PageType } from "./dm"
import { URL } from "../adapters/web/dm"

test("test_url_from_string_valid", () => {
    function check(s: string) {
        const rs = URL.fromString(s)
        expect(rs instanceof Error).toBeFalsy()
        expect((rs as URL).text).toEqual(s)
    }

    check("http://google.com")
    check("google.com")
    check("https://www.npmjs.com/package/html-metadata-parser")
})

test("test_url_from_string_invalid", () => {
    function check(s: string) {
        const rs = URL.fromString(s)
        expect(rs instanceof Error).toBeTruthy()
    }

    check("htt://google.com")
    check("googlecom")
    check("https://www. npmjs.com/package/html-metadata-parser")
})
