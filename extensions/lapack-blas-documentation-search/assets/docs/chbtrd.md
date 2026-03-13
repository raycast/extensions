```fortran
subroutine chbtrd (
        character vect,
        character uplo,
        integer n,
        integer kd,
        complex, dimension( ldab, * ) ab,
        integer ldab,
        real, dimension( * ) d,
        real, dimension( * ) e,
        complex, dimension( ldq, * ) q,
        integer ldq,
        complex, dimension( * ) work,
        integer info
)
```

CHBTRD reduces a complex Hermitian band matrix A to real symmetric
tridiagonal form T by a unitary similarity transformation:
Q\*\*H \* A \* Q = T.

## Parameters
VECT : CHARACTER\*1 [in]
> = 'N':  do not form Q;
> = 'V':  form Q;
> = 'U':  update a matrix X, by forming X\*Q.

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
> On exit, the diagonal elements of AB are overwritten by the
> diagonal elements of the tridiagonal matrix T; if KD > 0, the
> elements on the first superdiagonal (if UPLO = 'U') or the
> first subdiagonal (if UPLO = 'L') are overwritten by the
> off-diagonal elements of T; the rest of AB is overwritten by
> values generated during the reduction.

LDAB : INTEGER [in]
> The leading dimension of the array AB.  LDAB >= KD+1.

D : REAL array, dimension (N) [out]
> The diagonal elements of the tridiagonal matrix T.

E : REAL array, dimension (N-1) [out]
> The off-diagonal elements of the tridiagonal matrix T:
> E(i) = T(i,i+1) if UPLO = 'U'; E(i) = T(i+1,i) if UPLO = 'L'.

Q : COMPLEX array, dimension (LDQ,N) [in,out]
> On entry, if VECT = 'U', then Q must contain an N-by-N
> matrix X; if VECT = 'N' or 'V', then Q need not be set.
> 
> On exit:
> if VECT = 'V', Q contains the N-by-N unitary matrix Q;
> if VECT = 'U', Q contains the product X\*Q;
> if VECT = 'N', the array Q is not referenced.

LDQ : INTEGER [in]
> The leading dimension of the array Q.
> LDQ >= 1, and LDQ >= N if VECT = 'V' or 'U'.

WORK : COMPLEX array, dimension (N) [out]

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
