```fortran
logical function disnan (
        double precision, intent(in) din
)
```

DISNAN returns .TRUE. if its argument is NaN, and .FALSE.
otherwise.  To be replaced by the Fortran 2003 intrinsic in the
future.

## Parameters
DIN : DOUBLE PRECISION [in]
> Input to test for NaN.
