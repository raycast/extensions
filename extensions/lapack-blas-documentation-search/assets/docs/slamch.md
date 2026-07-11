```fortran
real function slamch (
        character cmach
)
```

SLAMCH determines single precision machine parameters.

## Parameters
CMACH : CHARACTER\*1 [in]
> Specifies the value to be returned by SLAMCH:
> = 'E' or 'e',   SLAMCH := eps
> = 'S' or 's ,   SLAMCH := sfmin
> = 'B' or 'b',   SLAMCH := base
> = 'P' or 'p',   SLAMCH := eps\*base
> = 'N' or 'n',   SLAMCH := t
> = 'R' or 'r',   SLAMCH := rnd
> = 'M' or 'm',   SLAMCH := emin
> = 'U' or 'u',   SLAMCH := rmin
> = 'L' or 'l',   SLAMCH := emax
> = 'O' or 'o',   SLAMCH := rmax
> where
> eps   = relative machine precision
> sfmin = safe minimum, such that 1/sfmin does not overflow
> base  = base of the machine
> prec  = eps\*base
> t     = number of (base) digits in the mantissa
> rnd   = 1.0 when rounding occurs in addition, 0.0 otherwise
> emin  = minimum exponent before (gradual) underflow
> rmin  = underflow threshold - base\*\*(emin-1)
> emax  = largest exponent before overflow
> rmax  = overflow threshold  - (base\*\*emax)\*(1-eps)
