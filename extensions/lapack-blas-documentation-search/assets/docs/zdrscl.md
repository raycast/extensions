```fortran
subroutine zdrscl (
        integer n,
        double precision sa,
        complex*16, dimension( * ) sx,
        integer incx
)
```

ZDRSCL multiplies an n-element complex vector x by the real scalar
1/a.  This is done without overflow or underflow as long as
the final result x/a does not overflow or underflow.

## Parameters
N : INTEGER [in]
> The number of components of the vector x.

SA : DOUBLE PRECISION [in]
> The scalar a which is used to divide each component of x.
> SA must be >= 0, or the subroutine will divide by zero.

SX : COMPLEX\*16 array, dimension [in,out]
> (1+(N-1)\*abs(INCX))
> The n-element vector x.

INCX : INTEGER [in]
> The increment between successive values of the vector SX.
> > 0:  SX(1) = X(1) and SX(1+(i-1)\*INCX) = x(i),     1< i<= n
