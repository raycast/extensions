```fortran
subroutine slartv (
        integer n,
        real, dimension( * ) x,
        integer incx,
        real, dimension( * ) y,
        integer incy,
        real, dimension( * ) c,
        real, dimension( * ) s,
        integer incc
)
```

SLARTV applies a vector of real plane rotations to elements of the
real vectors x and y. For i = 1,2,...,n

( x(i) ) := (  c(i)  s(i) ) ( x(i) )
( y(i) )    ( -s(i)  c(i) ) ( y(i) )

## Parameters
N : INTEGER [in]
> The number of plane rotations to be applied.

X : REAL array, [in,out]
> dimension (1+(N-1)\*INCX)
> The vector x.

INCX : INTEGER [in]
> The increment between elements of X. INCX > 0.

Y : REAL array, [in,out]
> dimension (1+(N-1)\*INCY)
> The vector y.

INCY : INTEGER [in]
> The increment between elements of Y. INCY > 0.

C : REAL array, dimension (1+(N-1)\*INCC) [in]
> The cosines of the plane rotations.

S : REAL array, dimension (1+(N-1)\*INCC) [in]
> The sines of the plane rotations.

INCC : INTEGER [in]
> The increment between elements of C and S. INCC > 0.
