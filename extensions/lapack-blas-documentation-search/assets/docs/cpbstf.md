```fortran
subroutine cpbstf (
        character uplo,
        integer n,
        integer kd,
        complex, dimension( ldab, * ) ab,
        integer ldab,
        integer info
)
```

CPBSTF computes a split Cholesky factorization of a complex
Hermitian positive definite band matrix A.

This routine is designed to be used in conjunction with CHBGST.

The factorization has the form  A = S\*\*H\*S  where S is a band matrix
of the same bandwidth as A and the following structure:

S = ( U    )
( M  L )

where U is upper triangular of order m = (n+kd)/2, and L is lower
triangular of order n-m.

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

KD : INTEGER [in]
> The number of superdiagonals of the matrix A if UPLO = 'U',
> or the number of subdiagonals if UPLO = 'L'.  KD >= 0.

AB : COMPLEX array, dimension (LDAB,N) [in,out]
> On entry, the upper or lower triangle of the Hermitian band
> matrix A, stored in the first kd+1 rows of the array.  The
> j-th column of A is stored in the j-th column of the array AB
> as follows:
> if UPLO = 'U', AB(kd+1+i-j,j) = A(i,j) for max(1,j-kd)<=i<=j;
> if UPLO = 'L', AB(1+i-j,j)    = A(i,j) for j<=i<=min(n,j+kd).
> 
> On exit, if INFO = 0, the factor S from the split Cholesky
> factorization A = S\*\*H\*S. See Further Details.

LDAB : INTEGER [in]
> The leading dimension of the array AB.  LDAB >= KD+1.

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument had an illegal value
> > 0: if INFO = i, the factorization could not be completed,
> because the updated element a(i,i) was negative; the
> matrix A is not positive definite.
