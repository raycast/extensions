```fortran
subroutine slassq (
        integer n,
        real(wp), dimension(*) x,
        integer incx,
        real(wp) scale,
        real(wp) sumsq
)
```

SLASSQ returns the values scale_out and sumsq_out such that

(scale_out\*\*2)\*sumsq_out = x( 1 )\*\*2 +...+ x( n )\*\*2 + (scale\*\*2)\*sumsq,

where x( i ) = X( 1 + ( i - 1 )\*INCX ). The value of sumsq is
assumed to be non-negative.

scale and sumsq must be supplied in SCALE and SUMSQ and
scale_out and sumsq_out are overwritten on SCALE and SUMSQ respectively.

## Parameters
N : INTEGER [in]
> The number of elements to be used from the vector x.

X : REAL array, dimension (1+(N-1)\*abs(INCX)) [in]
> The vector for which a scaled sum of squares is computed.
> x( i ) = X( 1 + ( i - 1 )\*INCX ), 1 <= i <= n.

INCX : INTEGER [in]
> The increment between successive values of the vector x.
> If INCX > 0, X(1+(i-1)\*INCX) = x(i) for 1 <= i <= n
> If INCX < 0, X(1-(n-i)\*INCX) = x(i) for 1 <= i <= n
> If INCX = 0, x isn't a vector so there is no need to call
> this subroutine. If you call it anyway, it will count x(1)
> in the vector norm N times.

SCALE : REAL [in,out]
> On entry, the value scale in the equation above.
> On exit, SCALE is overwritten by scale_out, the scaling factor
> for the sum of squares.

SUMSQ : REAL [in,out]
> On entry, the value sumsq in the equation above.
> On exit, SUMSQ is overwritten by sumsq_out, the basic sum of
> squares from which scale_out has been factored out.
