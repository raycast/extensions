```fortran
logical function sisnan (
        real, intent(in) sin
)
```

SISNAN returns .TRUE. if its argument is NaN, and .FALSE.
otherwise.  To be replaced by the Fortran 2003 intrinsic in the
future.

## Parameters
SIN : REAL [in]
> Input to test for NaN.
