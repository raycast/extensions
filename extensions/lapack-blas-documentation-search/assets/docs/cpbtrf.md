```fortran
subroutine cpbtrf (
        character uplo,
        integer n,
        integer kd,
        complex, dimension( ldab, * ) ab,
        integer ldab,
        integer info
)
```

CPBTRF computes the Cholesky factorization of a complex Hermitian
positive definite band matrix A.

The factorization has the form
A = U\*\*H \* U,  if UPLO = 'U', or
A = L  \* L\*\*H,  if UPLO = 'L',
where U is an upper triangular matrix and L is lower triangular.

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
> matrix A, stored in the first KD+1 rows of the array.  The
> j-th column of A is stored in the j-th column of the array AB
> as follows:
> if UPLO = 'U', AB(kd+1+i-j,j) = A(i,j) for max(1,j-kd)<=i<=j;
> if UPLO = 'L', AB(1+i-j,j)    = A(i,j) for j<=i<=min(n,j+kd).
> 
> On exit, if INFO = 0, the triangular factor U or L from the
> Cholesky factorization A = U\*\*H\*U or A = L\*L\*\*H of the band
> matrix A, in the same storage format as A.

LDAB : INTEGER [in]
> The leading dimension of the array AB.  LDAB >= KD+1.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  if INFO = i, the leading principal minor of order i
> is not positive, and the factorization could not be
> completed.
