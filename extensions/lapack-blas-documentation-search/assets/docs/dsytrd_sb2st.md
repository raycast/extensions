```fortran
subroutine dsytrd_sb2st (
        character stage1,
        character vect,
        character uplo,
        integer n,
        integer kd,
        double precision, dimension( ldab, * ) ab,
        integer ldab,
        double precision, dimension( * ) d,
        double precision, dimension( * ) e,
        double precision, dimension( * ) hous,
        integer lhous,
        double precision, dimension( * ) work,
        integer lwork,
        integer info
)
```

DSYTRD_SB2ST reduces a real symmetric band matrix A to real symmetric
tridiagonal form T by a orthogonal similarity transformation:
Q\*\*T \* A \* Q = T.

## Parameters
STAGE1 : CHARACTER\*1 [in]
> = 'N':  : to mention that the stage 1 of the reduction
> from dense to band using the dsytrd_sy2sb routine
> was not called before this routine to reproduce AB.
> In other term this routine is called as standalone.
> = 'Y':  : to mention that the stage 1 of the
> reduction from dense to band using the dsytrd_sy2sb
> routine has been called to produce AB (e.g., AB is
> the output of dsytrd_sy2sb.

VECT : CHARACTER\*1 [in]
> = 'N':  No need for the Housholder representation,
> and thus LHOUS is of size max(1, 4\*N);
> = 'V':  the Householder representation is needed to
> either generate or to apply Q later on,
> then LHOUS is to be queried and computed.
> (NOT AVAILABLE IN THIS RELEASE).

UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

KD : INTEGER [in]
> The number of superdiagonals of the matrix A if UPLO = 'U',
> or the number of subdiagonals if UPLO = 'L'.  KD >= 0.

AB : DOUBLE PRECISION array, dimension (LDAB,N) [in,out]
> On entry, the upper or lower triangle of the symmetric band
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

D : DOUBLE PRECISION array, dimension (N) [out]
> The diagonal elements of the tridiagonal matrix T.

E : DOUBLE PRECISION array, dimension (N-1) [out]
> The off-diagonal elements of the tridiagonal matrix T:
> E(i) = T(i,i+1) if UPLO = 'U'; E(i) = T(i+1,i) if UPLO = 'L'.

HOUS : DOUBLE PRECISION array, dimension (MAX(1,LHOUS)) [out]
> Stores the Householder representation.

LHOUS : INTEGER [in]
> The dimension of the array HOUS.
> If N = 0 or KD <= 1, LHOUS >= 1, else LHOUS = MAX(1, dimension).
> 
> If LWORK = -1, or LHOUS = -1,
> then a query is assumed; the routine
> only calculates the optimal size of the HOUS array, returns
> this value as the first entry of the HOUS array, and no error
> message related to LHOUS is issued by XERBLA.
> LHOUS = MAX(1, dimension) where
> dimension = 4\*N if VECT='N'
> not available now if VECT='H'

WORK : DOUBLE PRECISION array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK.
> If N = 0 or KD <= 1, LWORK >= 1, else LWORK = MAX(1, dimension).
> 
> If LWORK = -1, or LHOUS = -1,
> then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.
> LWORK = MAX(1, dimension) where
> dimension   = (2KD+1)\*N + KD\*NTHREADS
> where KD is the blocking size of the reduction,
> FACTOPTNB is the blocking used by the QR or LQ
> algorithm, usually FACTOPTNB=128 is a good choice
> NTHREADS is the number of threads used when
> openMP compilation is enabled, otherwise =1.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
