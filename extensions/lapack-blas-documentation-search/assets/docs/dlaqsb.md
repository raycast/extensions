```fortran
subroutine dlaqsb (
        character uplo,
        integer n,
        integer kd,
        double precision, dimension( ldab, * ) ab,
        integer ldab,
        double precision, dimension( * ) s,
        double precision scond,
        double precision amax,
        character equed
)
```

DLAQSB equilibrates a symmetric band matrix A using the scaling
factors in the vector S.

## Parameters
UPLO : CHARACTER\*1 [in]
> Specifies whether the upper or lower triangular part of the
> symmetric matrix A is stored.
> = 'U':  Upper triangular
> = 'L':  Lower triangular

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

KD : INTEGER [in]
> The number of super-diagonals of the matrix A if UPLO = 'U',
> or the number of sub-diagonals if UPLO = 'L'.  KD >= 0.

AB : DOUBLE PRECISION array, dimension (LDAB,N) [in,out]
> On entry, the upper or lower triangle of the symmetric band
> matrix A, stored in the first KD+1 rows of the array.  The
> j-th column of A is stored in the j-th column of the array AB
> as follows:
> if UPLO = 'U', AB(kd+1+i-j,j) = A(i,j) for max(1,j-kd)<=i<=j;
> if UPLO = 'L', AB(1+i-j,j)    = A(i,j) for j<=i<=min(n,j+kd).
> 
> On exit, if INFO = 0, the triangular factor U or L from the
> Cholesky factorization A = U\*\*T\*U or A = L\*L\*\*T of the band
> matrix A, in the same storage format as A.

LDAB : INTEGER [in]
> The leading dimension of the array AB.  LDAB >= KD+1.

S : DOUBLE PRECISION array, dimension (N) [in]
> The scale factors for A.

SCOND : DOUBLE PRECISION [in]
> Ratio of the smallest S(i) to the largest S(i).

AMAX : DOUBLE PRECISION [in]
> Absolute value of largest matrix entry.

EQUED : CHARACTER\*1 [out]
> Specifies whether or not equilibration was done.
> = 'N':  No equilibration.
> = 'Y':  Equilibration was done, i.e., A has been replaced by
> diag(S) \* A \* diag(S).
