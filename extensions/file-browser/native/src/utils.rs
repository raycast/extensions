use core_foundation::{
    array::CFArray,
    base::{CFGetTypeID, CFTypeRef, TCFType},
    boolean::CFBoolean,
    date::CFDate,
    number::CFNumber,
    string::CFString,
};

pub fn to_string_vec(v: CFTypeRef) -> Vec<String> {
    if v.is_null() {
        return vec![];
    }
    unsafe {
        if CFGetTypeID(v) == CFArray::<*const std::ffi::c_void>::type_id() {
            let arr: CFArray<*const std::ffi::c_void> = CFArray::wrap_under_get_rule(v as _);
            let mut out = Vec::with_capacity(arr.len() as usize);
            for i in 0..arr.len() {
                if let Some(elem) = arr.get(i) {
                    let s = CFString::wrap_under_get_rule((*elem) as _);
                    out.push(s.to_string());
                }
            }
            out
        } else if CFGetTypeID(v) == CFString::type_id() {
            let s = CFString::wrap_under_get_rule(v as _);
            vec![s.to_string()]
        } else {
            vec![]
        }
    }
}

pub fn to_string_opt(v: CFTypeRef) -> Option<String> {
    if v.is_null() {
        return None;
    }
    unsafe {
        if CFGetTypeID(v) == CFString::type_id() {
            let s = CFString::wrap_under_get_rule(v as _);
            Some(s.to_string())
        } else {
            None
        }
    }
}

#[allow(dead_code)]
pub fn to_u64_opt(v: CFTypeRef) -> Option<u64> {
    if v.is_null() {
        return None;
    }
    unsafe {
        if CFGetTypeID(v) == CFNumber::type_id() {
            let n = CFNumber::wrap_under_get_rule(v as _);
            n.to_i64()
                .and_then(|x| if x >= 0 { Some(x as u64) } else { None })
        } else {
            None
        }
    }
}

pub fn to_bool_opt(v: CFTypeRef) -> Option<bool> {
    if v.is_null() {
        return None;
    }
    unsafe {
        if CFGetTypeID(v) == CFBoolean::type_id() {
            let b = CFBoolean::wrap_under_get_rule(v as _);
            Some(bool::from(b))
        } else {
            None
        }
    }
}

pub fn to_unix_seconds_opt(v: CFTypeRef) -> Option<u64> {
    if v.is_null() {
        return None;
    }
    unsafe {
        if CFGetTypeID(v) == CFDate::type_id() {
            let d = CFDate::wrap_under_get_rule(v as _);
            let secs = d.abs_time() + 978_307_200.0; // CFAbsoluteTime -> Unix epoch
            if secs.is_sign_negative() {
                None
            } else {
                Some(secs as u64)
            }
        } else if CFGetTypeID(v) == CFNumber::type_id() {
            let n = CFNumber::wrap_under_get_rule(v as _);
            n.to_i64()
                .and_then(|x| if x >= 0 { Some(x as u64) } else { None })
        } else {
            to_string_opt(v).and_then(|s| s.trim().parse::<u64>().ok())
        }
    }
}
